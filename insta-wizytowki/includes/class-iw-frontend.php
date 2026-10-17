<?php
/**
 * Front: skrypty konfiguratora i shortcode [insta_wizytowka] (samodzielny podgląd bez koszyka).
 */

defined( 'ABSPATH' ) || exit;

class IW_Frontend {

	public static function init() {
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'register_assets' ) );
		add_shortcode( 'insta_wizytowka', array( __CLASS__, 'shortcode' ) );
	}

	public static function register_assets() {
		wp_register_style( 'iw-fonts', 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Montserrat:wght@600;700&family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@500;600&display=swap', array(), null );
		wp_register_style( 'iw-configurator', IW_URL . 'assets/configurator.css', array( 'iw-fonts' ), IW_VERSION );
		wp_register_script( 'iw-jspdf', IW_URL . 'assets/vendor/jspdf.umd.min.js', array(), '2.5.1', true );
		wp_register_script( 'iw-qrcode', IW_URL . 'assets/vendor/qrcode.js', array(), '1.4.4', true );
		wp_register_script( 'iw-renderer', IW_URL . 'assets/renderer.js', array( 'iw-qrcode' ), IW_VERSION, true );
		wp_register_script( 'iw-configurator', IW_URL . 'assets/configurator.js', array( 'iw-renderer', 'iw-jspdf' ), IW_VERSION, true );
	}

	public static function enqueue() {
		wp_enqueue_style( 'iw-configurator' );
		wp_enqueue_script( 'iw-configurator' );
		wp_localize_script(
			'iw-configurator',
			'IW_CONFIG',
			array(
				'restUrl'     => esc_url_raw( rest_url( IW_Rest::NS ) ),
				'nonce'       => wp_create_nonce( 'wp_rest' ),
				'print'       => IW_Settings::print_spec(),
				// Widok „plik do druku” i pobieranie PDF tylko dla obsługi sklepu – klient widzi samą wizualizację.
				'canDownload' => current_user_can( 'manage_woocommerce' ) || current_user_can( 'manage_options' ),
				'backgrounds' => IW_Backgrounds::all(),
				'styles'      => IW_Backgrounds::style_names(),
			)
		);
	}

	/**
	 * @param string $mode 'standalone' albo 'product' (wewnątrz formularza dodawania do koszyka).
	 */
	public static function markup( $mode = 'standalone' ) {
		self::enqueue();
		return '<div class="iw-app" data-mode="' . esc_attr( $mode ) . '"><noscript>Konfigurator wymaga włączonej obsługi JavaScript.</noscript></div>';
	}

	public static function shortcode() {
		return self::markup( 'standalone' );
	}
}
