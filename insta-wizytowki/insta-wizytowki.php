<?php
/**
 * Plugin Name:       Insta Wizytówki – konfigurator
 * Description:       Konfigurator instawizytówek: pobiera profil Instagram, pokazuje podgląd 1:1 i generuje plik PDF do druku ze spadami. Integracja z WooCommerce.
 * Version:           0.1.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Insta Wizytówki
 * Text Domain:       insta-wizytowki
 */

defined( 'ABSPATH' ) || exit;

define( 'IW_VERSION', '0.1.0' );
define( 'IW_FILE', __FILE__ );
define( 'IW_DIR', plugin_dir_path( __FILE__ ) );
define( 'IW_URL', plugin_dir_url( __FILE__ ) );

require_once IW_DIR . 'includes/class-iw-settings.php';
require_once IW_DIR . 'includes/class-iw-storage.php';
require_once IW_DIR . 'includes/class-iw-profile-fetcher.php';
require_once IW_DIR . 'includes/class-iw-rest.php';
require_once IW_DIR . 'includes/class-iw-frontend.php';
require_once IW_DIR . 'includes/class-iw-woocommerce.php';

add_action(
	'plugins_loaded',
	function () {
		IW_Settings::init();
		IW_Storage::init();
		IW_Rest::init();
		IW_Frontend::init();
		if ( class_exists( 'WooCommerce' ) ) {
			IW_WooCommerce::init();
		}
	}
);

register_activation_hook( __FILE__, array( 'IW_Storage', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'IW_Storage', 'deactivate' ) );
