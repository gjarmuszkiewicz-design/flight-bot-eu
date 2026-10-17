<?php
/**
 * REST API konfiguratora:
 *   GET  /wp-json/insta-wizytowki/v1/profile?username=...   – dane profilu
 *   POST /wp-json/insta-wizytowki/v1/project                – zapis projektu (PDF do druku + podglądy + dane)
 */

defined( 'ABSPATH' ) || exit;

class IW_Rest {

	const NS             = 'insta-wizytowki/v1';
	const MAX_PDF_BYTES  = 30 * 1024 * 1024;
	const MAX_PNG_BYTES  = 5 * 1024 * 1024;
	const PROJECTS_PER_H = 40;

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	public static function routes() {
		register_rest_route(
			self::NS,
			'/profile',
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'profile' ),
				'permission_callback' => '__return_true',
				'args'                => array( 'username' => array( 'required' => true ) ),
			)
		);
		register_rest_route(
			self::NS,
			'/project',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'project' ),
				'permission_callback' => '__return_true',
			)
		);
	}

	/** Prosty limit zapytań na IP w oknie godzinowym. */
	private static function rate_limited( $bucket, $limit ) {
		$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '0';
		$key = 'iw_rl_' . $bucket . '_' . md5( $ip );
		$n   = (int) get_transient( $key );
		if ( $n >= $limit && ! current_user_can( 'manage_woocommerce' ) ) {
			return true;
		}
		set_transient( $key, $n + 1, HOUR_IN_SECONDS );
		return false;
	}

	public static function profile( WP_REST_Request $req ) {
		$username = IW_Profile_Fetcher::normalize_username( $req->get_param( 'username' ) );
		if ( ! $username ) {
			return new WP_Error( 'iw_bad_username', 'Podaj poprawny link do profilu lub nazwę użytkownika.', array( 'status' => 400 ) );
		}
		if ( self::rate_limited( 'profile', max( 1, (int) IW_Settings::get( 'rate_limit' ) ) ) ) {
			return new WP_Error( 'iw_rate', 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.', array( 'status' => 429 ) );
		}
		$profile = IW_Profile_Fetcher::get( $username );
		if ( is_wp_error( $profile ) ) {
			$status = 'iw_not_found' === $profile->get_error_code() ? 404 : 502;
			return new WP_Error( $profile->get_error_code(), $profile->get_error_message(), array( 'status' => $status ) );
		}
		return rest_ensure_response( $profile );
	}

	public static function project( WP_REST_Request $req ) {
		if ( self::rate_limited( 'project', self::PROJECTS_PER_H ) ) {
			return new WP_Error( 'iw_rate', 'Zbyt wiele zapytań. Spróbuj ponownie za chwilę.', array( 'status' => 429 ) );
		}
		$files = $req->get_file_params();
		$data  = json_decode( (string) $req->get_param( 'data' ), true );

		if ( ! is_array( $data ) || empty( $files['print'] ) || empty( $files['front'] ) || empty( $files['back'] ) ) {
			return new WP_Error( 'iw_bad_request', 'Niekompletne dane projektu.', array( 'status' => 400 ) );
		}

		$pdf = $files['print'];
		if ( UPLOAD_ERR_OK !== $pdf['error'] || $pdf['size'] > self::MAX_PDF_BYTES || '%PDF' !== file_get_contents( $pdf['tmp_name'], false, null, 0, 4 ) ) {
			return new WP_Error( 'iw_bad_pdf', 'Niepoprawny plik PDF.', array( 'status' => 400 ) );
		}
		foreach ( array( 'front', 'back' ) as $side ) {
			$f    = $files[ $side ];
			$info = UPLOAD_ERR_OK === $f['error'] && $f['size'] <= self::MAX_PNG_BYTES ? @getimagesize( $f['tmp_name'] ) : false;
			if ( ! $info || IMAGETYPE_PNG !== $info[2] ) {
				return new WP_Error( 'iw_bad_preview', 'Niepoprawny podgląd.', array( 'status' => 400 ) );
			}
		}

		$id         = bin2hex( random_bytes( 16 ) );
		list( $dir, $url ) = IW_Storage::sub_dir( 'projects/' . $id );

		move_uploaded_file( $pdf['tmp_name'], $dir . '/print.pdf' );
		move_uploaded_file( $files['front']['tmp_name'], $dir . '/front.png' );
		move_uploaded_file( $files['back']['tmp_name'], $dir . '/back.png' );

		$clean = array(
			'username'   => IW_Profile_Fetcher::normalize_username( $data['username'] ?? '' ),
			'name'       => sanitize_text_field( $data['name'] ?? '' ),
			'phone'      => sanitize_text_field( $data['phone'] ?? '' ),
			'email'      => sanitize_text_field( $data['email'] ?? '' ),
			'theme'      => sanitize_key( $data['theme'] ?? '' ),
			'print_spec' => IW_Settings::print_spec(),
			'created'    => gmdate( 'c' ),
			'state'      => $data['state'] ?? null, // pełny stan edytora – do ponownego wygenerowania pliku.
		);
		file_put_contents( $dir . '/project.json', wp_json_encode( $clean ) );

		return rest_ensure_response(
			array(
				'id'    => $id,
				'front' => $url . '/front.png',
				'back'  => $url . '/back.png',
			)
		);
	}
}
