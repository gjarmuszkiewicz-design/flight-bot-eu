<?php
/**
 * Przechowywanie plików: kopie zdjęć z Instagrama oraz projekty (PDF do druku, podglądy, dane).
 *
 * Struktura w wp-content/uploads/insta-wizytowki/:
 *   cache/{username}/{hash}.jpg   – zdjęcia pobrane z Instagrama (linki z CDN Instagrama wygasają)
 *   projects/{uuid}/print.pdf     – plik do druku
 *   projects/{uuid}/front.png     – podgląd przodu (miniatura w koszyku)
 *   projects/{uuid}/back.png      – podgląd tyłu
 *   projects/{uuid}/project.json  – dane projektu
 *   projects/{uuid}/order.txt     – istnieje, gdy projekt trafił do zamówienia (chroni przed sprzątaniem)
 */

defined( 'ABSPATH' ) || exit;

class IW_Storage {

	const CRON_HOOK          = 'iw_cleanup';
	const ABANDONED_DAYS     = 30;

	public static function init() {
		add_action( self::CRON_HOOK, array( __CLASS__, 'cleanup' ) );
	}

	public static function activate() {
		self::base_dir();
		if ( ! wp_next_scheduled( self::CRON_HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::CRON_HOOK );
		}
	}

	public static function deactivate() {
		wp_clear_scheduled_hook( self::CRON_HOOK );
	}

	/** Zwraca [ścieżka, url] katalogu bazowego, tworząc go przy potrzebie. */
	public static function base_dir() {
		$up   = wp_upload_dir();
		$path = trailingslashit( $up['basedir'] ) . 'insta-wizytowki';
		$url  = trailingslashit( $up['baseurl'] ) . 'insta-wizytowki';
		if ( ! is_dir( $path ) ) {
			wp_mkdir_p( $path );
		}
		if ( ! file_exists( $path . '/index.php' ) ) {
			file_put_contents( $path . '/index.php', "<?php // Silence is golden.\n" );
		}
		// Apache: PDF-y do druku pobiera się tylko przez panel (nginx wymaga osobnej reguły – patrz README).
		if ( ! file_exists( $path . '/.htaccess' ) ) {
			file_put_contents( $path . '/.htaccess', "Options -Indexes\n<FilesMatch \"\\.(pdf|json|txt)$\">\nRequire all denied\n</FilesMatch>\n" );
		}
		return array( $path, $url );
	}

	public static function sub_dir( $relative ) {
		list( $path, $url ) = self::base_dir();
		$p                  = $path . '/' . $relative;
		if ( ! is_dir( $p ) ) {
			wp_mkdir_p( $p );
		}
		return array( $p, $url . '/' . $relative );
	}

	public static function is_valid_id( $id ) {
		return is_string( $id ) && (bool) preg_match( '/^[a-f0-9]{32}$/', $id );
	}

	public static function project_dir( $id ) {
		if ( ! self::is_valid_id( $id ) ) {
			return null;
		}
		list( $path, $url ) = self::base_dir();
		$p                  = $path . '/projects/' . $id;
		return is_dir( $p ) ? array( $p, $url . '/projects/' . $id ) : null;
	}

	public static function project_data( $id ) {
		$dir = self::project_dir( $id );
		if ( ! $dir || ! file_exists( $dir[0] . '/project.json' ) ) {
			return null;
		}
		$data = json_decode( (string) file_get_contents( $dir[0] . '/project.json' ), true );
		return is_array( $data ) ? $data : null;
	}

	public static function mark_ordered( $id, $order_id ) {
		$dir = self::project_dir( $id );
		if ( $dir ) {
			file_put_contents( $dir[0] . '/order.txt', (string) $order_id );
		}
	}

	/**
	 * Pobiera obraz z zewnętrznego adresu i zapisuje lokalnie. Zwraca lokalny URL albo null.
	 * Lokalna kopia jest potrzebna, bo canvas w przeglądarce nie może eksportować obrazów z obcej domeny.
	 */
	public static function localize_image( $remote_url, $username ) {
		if ( empty( $remote_url ) || ! wp_http_validate_url( $remote_url ) ) {
			return null;
		}
		list( $dir, $url ) = self::sub_dir( 'cache/' . sanitize_file_name( $username ) );
		$name              = md5( $remote_url ) . '.jpg';
		if ( file_exists( $dir . '/' . $name ) ) {
			return $url . '/' . $name;
		}
		$res = wp_safe_remote_get( $remote_url, array( 'timeout' => 15, 'limit_response_size' => 8 * MB_IN_BYTES ) );
		if ( is_wp_error( $res ) || 200 !== wp_remote_retrieve_response_code( $res ) ) {
			return null;
		}
		$type = (string) wp_remote_retrieve_header( $res, 'content-type' );
		$body = wp_remote_retrieve_body( $res );
		if ( 0 !== strpos( $type, 'image/' ) || '' === $body || false === @getimagesizefromstring( $body ) ) {
			return null;
		}
		file_put_contents( $dir . '/' . $name, $body );
		return $url . '/' . $name;
	}

	/** Sprzątanie: porzucone projekty i stare kopie zdjęć. */
	public static function cleanup() {
		list( $base ) = self::base_dir();
		$now          = time();

		foreach ( (array) glob( $base . '/projects/*', GLOB_ONLYDIR ) as $dir ) {
			if ( ! file_exists( $dir . '/order.txt' ) && $now - filemtime( $dir ) > self::ABANDONED_DAYS * DAY_IN_SECONDS ) {
				self::rrmdir( $dir );
			}
		}

		$cache_ttl = max( 1, (int) IW_Settings::get( 'cache_hours' ) ) * HOUR_IN_SECONDS * 2;
		foreach ( (array) glob( $base . '/cache/*', GLOB_ONLYDIR ) as $dir ) {
			if ( $now - filemtime( $dir ) > $cache_ttl ) {
				self::rrmdir( $dir );
			}
		}
	}

	private static function rrmdir( $dir ) {
		foreach ( (array) glob( $dir . '/{,.}[!.,!..]*', GLOB_BRACE ) as $file ) {
			is_dir( $file ) ? self::rrmdir( $file ) : unlink( $file );
		}
		rmdir( $dir );
	}
}
