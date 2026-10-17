<?php
/**
 * Ustawienia wtyczki: źródło danych Instagram oraz specyfikacja druku.
 */

defined( 'ABSPATH' ) || exit;

class IW_Settings {

	const OPTION = 'iw_settings';

	public static function defaults() {
		return array(
			// Źródło danych.
			'provider'          => 'demo',   // demo | hikerapi | business_discovery
			'fallback_provider' => 'none',   // none | hikerapi | business_discovery
			'hiker_key'         => '',
			'bd_ig_user_id'     => '',
			'bd_token'          => '',
			'cache_hours'       => 48,
			'rate_limit'        => 30,       // zapytań o profil na godzinę z jednego IP.

			// Specyfikacja druku (mm). Wszystko w jednym miejscu, żeby łatwo podmienić na wymagania drukarni.
			'trim_w'            => 55,
			'trim_h'            => 85,
			'bleed'             => 3,
			'safe'              => 4,
			'dpi'               => 300,
			'corner_radius'     => 3,        // tylko podgląd (wykrojnik), plik do druku jest prostokątny.
			'crop_marks'        => 0,
			'slug'              => 5,        // margines na znaczniki cięcia.
			'jpeg_quality'      => 95,
		);
	}

	public static function all() {
		$saved = get_option( self::OPTION, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::defaults() );
	}

	public static function get( $key ) {
		$all = self::all();
		return isset( $all[ $key ] ) ? $all[ $key ] : null;
	}

	/** Parametry druku przekazywane do przeglądarki. */
	public static function print_spec() {
		$s = self::all();
		return array(
			'trimW'        => (float) $s['trim_w'],
			'trimH'        => (float) $s['trim_h'],
			'bleed'        => (float) $s['bleed'],
			'safe'         => (float) $s['safe'],
			'dpi'          => (int) $s['dpi'],
			'cornerRadius' => (float) $s['corner_radius'],
			'cropMarks'    => (bool) $s['crop_marks'],
			'slug'         => (float) $s['slug'],
			'jpegQuality'  => max( 50, min( 100, (int) $s['jpeg_quality'] ) ) / 100,
		);
	}

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
	}

	public static function menu() {
		add_options_page( 'Insta Wizytówki', 'Insta Wizytówki', 'manage_options', 'insta-wizytowki', array( __CLASS__, 'page' ) );
	}

	public static function register() {
		register_setting( 'iw_settings_group', self::OPTION, array( 'sanitize_callback' => array( __CLASS__, 'sanitize' ) ) );
	}

	public static function sanitize( $input ) {
		$d   = self::defaults();
		$out = array();
		$mm  = array( 'trim_w', 'trim_h', 'bleed', 'safe', 'corner_radius', 'slug' );
		foreach ( $d as $key => $default ) {
			if ( 'crop_marks' === $key ) {
				$out[ $key ] = empty( $input[ $key ] ) ? 0 : 1;
				continue;
			}
			$value = isset( $input[ $key ] ) ? $input[ $key ] : $default;
			if ( in_array( $key, $mm, true ) ) {
				$out[ $key ] = max( 0, (float) str_replace( ',', '.', (string) $value ) );
			} elseif ( is_int( $default ) ) {
				$out[ $key ] = (int) $value;
			} else {
				$out[ $key ] = sanitize_text_field( $value );
			}
		}
		$out['dpi'] = max( 150, min( 600, $out['dpi'] ) );
		return $out;
	}

	private static function field( $key, $label, $type = 'text', $help = '', $options = array() ) {
		$s    = self::all();
		$name = self::OPTION . '[' . $key . ']';
		echo '<tr><th scope="row"><label for="iw-' . esc_attr( $key ) . '">' . esc_html( $label ) . '</label></th><td>';
		if ( 'select' === $type ) {
			echo '<select id="iw-' . esc_attr( $key ) . '" name="' . esc_attr( $name ) . '">';
			foreach ( $options as $v => $l ) {
				echo '<option value="' . esc_attr( $v ) . '"' . selected( $s[ $key ], $v, false ) . '>' . esc_html( $l ) . '</option>';
			}
			echo '</select>';
		} elseif ( 'checkbox' === $type ) {
			echo '<input type="checkbox" id="iw-' . esc_attr( $key ) . '" name="' . esc_attr( $name ) . '" value="1"' . checked( (int) $s[ $key ], 1, false ) . '>';
		} else {
			echo '<input class="regular-text" type="' . esc_attr( $type ) . '" step="any" id="iw-' . esc_attr( $key ) . '" name="' . esc_attr( $name ) . '" value="' . esc_attr( $s[ $key ] ) . '">';
		}
		if ( $help ) {
			echo '<p class="description">' . esc_html( $help ) . '</p>';
		}
		echo '</td></tr>';
	}

	public static function page() {
		$providers = array(
			'demo'               => 'Demo (dane przykładowe, bez API)',
			'hikerapi'           => 'HikerAPI (płatne, każdy publiczny profil)',
			'business_discovery' => 'Meta Business Discovery (darmowe, konta firmowe i twórców)',
		);
		?>
		<div class="wrap">
			<h1>Insta Wizytówki</h1>
			<form method="post" action="options.php">
				<?php settings_fields( 'iw_settings_group' ); ?>
				<h2>Źródło danych Instagram</h2>
				<table class="form-table">
					<?php
					self::field( 'provider', 'Główne źródło', 'select', '', $providers );
					self::field( 'fallback_provider', 'Źródło zapasowe', 'select', 'Używane, gdy główne zwróci błąd.', array( 'none' => 'Brak' ) + $providers );
					self::field( 'hiker_key', 'HikerAPI – klucz (x-access-key)', 'password' );
					self::field( 'bd_ig_user_id', 'Business Discovery – ID Twojego konta IG', 'text', 'Numeryczne ID konta firmowego połączonego ze stroną FB.' );
					self::field( 'bd_token', 'Business Discovery – token', 'password', 'Najlepiej token użytkownika systemowego (nie wygasa).' );
					self::field( 'cache_hours', 'Pamięć podręczna (godziny)', 'number' );
					self::field( 'rate_limit', 'Limit zapytań na godzinę z jednego IP', 'number' );
					?>
				</table>
				<h2>Specyfikacja druku</h2>
				<table class="form-table">
					<?php
					self::field( 'trim_w', 'Szerokość netto (mm)', 'number' );
					self::field( 'trim_h', 'Wysokość netto (mm)', 'number' );
					self::field( 'bleed', 'Spad (mm, z każdej strony)', 'number' );
					self::field( 'safe', 'Strefa bezpieczna od linii cięcia (mm)', 'number' );
					self::field( 'dpi', 'Rozdzielczość (DPI)', 'number' );
					self::field( 'corner_radius', 'Promień zaokrąglenia rogów (mm, tylko podgląd)', 'number' );
					self::field( 'crop_marks', 'Znaczniki cięcia', 'checkbox' );
					self::field( 'slug', 'Margines na znaczniki (mm)', 'number' );
					self::field( 'jpeg_quality', 'Jakość JPEG w PDF (50–100)', 'number' );
					?>
				</table>
				<?php submit_button(); ?>
			</form>
		</div>
		<?php
	}
}
