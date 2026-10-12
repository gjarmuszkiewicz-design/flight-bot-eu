<?php
/**
 * Plugin Name:       Zdalny Edytor Strony
 * Description:       REST API do zdalnej edycji strony: bloki Gutenberga, ustawienia Astry, CSS, opcje, wyszukaj i zamień, migawki z możliwością cofnięcia zmian.
 * Version:           0.1.0
 * Requires at least: 6.2
 * Requires PHP:      7.4
 * Author:            Grzegorz Jarmuszkiewicz
 * License:           GPL-2.0-or-later
 * Text Domain:       zdalny-edytor
 */

defined( 'ABSPATH' ) || exit;

define( 'ZE_VERSION', '0.1.0' );
define( 'ZE_NAMESPACE', 'zdalny-edytor/v1' );
define( 'ZE_DIR', plugin_dir_path( __FILE__ ) );

require_once ZE_DIR . 'includes/class-ze-snapshots.php';
require_once ZE_DIR . 'includes/class-ze-blocks.php';
require_once ZE_DIR . 'includes/class-ze-rest.php';
require_once ZE_DIR . 'includes/class-ze-admin.php';

add_action( 'init', array( 'ZE_Snapshots', 'register_post_type' ) );
add_action( 'rest_api_init', array( 'ZE_Rest', 'register_routes' ) );

if ( is_admin() ) {
	ZE_Admin::init();
}

register_activation_hook(
	__FILE__,
	function () {
		add_option( 'ze_enabled', 1 );
	}
);
