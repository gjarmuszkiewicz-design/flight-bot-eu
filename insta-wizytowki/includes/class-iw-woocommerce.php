<?php
/**
 * Integracja z WooCommerce:
 * - pole „Instawizytówka – konfigurator” w produkcie,
 * - konfigurator nad przyciskiem „Dodaj do koszyka”,
 * - projekt zapisany w pozycji koszyka i zamówienia,
 * - w panelu zamówienia: podgląd i pobranie PDF do druku.
 */

defined( 'ABSPATH' ) || exit;

class IW_WooCommerce {

	const META_ENABLED = '_iw_enabled';
	const ITEM_META    = '_iw_project_id';

	public static function init() {
		add_action( 'woocommerce_product_options_general_product_data', array( __CLASS__, 'product_field' ) );
		add_action( 'woocommerce_process_product_meta', array( __CLASS__, 'save_product_field' ) );

		add_action( 'woocommerce_before_add_to_cart_button', array( __CLASS__, 'render_configurator' ) );
		add_filter( 'woocommerce_add_to_cart_validation', array( __CLASS__, 'validate' ), 10, 2 );
		add_filter( 'woocommerce_add_cart_item_data', array( __CLASS__, 'cart_item_data' ), 10, 2 );
		add_filter( 'woocommerce_get_item_data', array( __CLASS__, 'display_item_data' ), 10, 2 );
		add_filter( 'woocommerce_cart_item_thumbnail', array( __CLASS__, 'cart_thumbnail' ), 10, 2 );
		add_action( 'woocommerce_checkout_create_order_line_item', array( __CLASS__, 'order_item_meta' ), 10, 3 );

		add_filter( 'woocommerce_hidden_order_itemmeta', array( __CLASS__, 'hide_meta' ) );
		add_action( 'woocommerce_after_order_itemmeta', array( __CLASS__, 'admin_item_preview' ), 10, 2 );
		add_action( 'admin_post_iw_download', array( __CLASS__, 'download' ) );
	}

	private static function enabled( $product_id ) {
		return 'yes' === get_post_meta( $product_id, self::META_ENABLED, true );
	}

	public static function product_field() {
		woocommerce_wp_checkbox(
			array(
				'id'          => self::META_ENABLED,
				'label'       => 'Instawizytówka – konfigurator',
				'description' => 'Pokaż konfigurator z podglądem profilu Instagram i wymagaj projektu przed dodaniem do koszyka.',
			)
		);
	}

	public static function save_product_field( $post_id ) {
		update_post_meta( $post_id, self::META_ENABLED, isset( $_POST[ self::META_ENABLED ] ) ? 'yes' : 'no' ); // phpcs:ignore WordPress.Security.NonceVerification
	}

	public static function render_configurator() {
		global $product;
		if ( ! $product || ! self::enabled( $product->get_id() ) ) {
			return;
		}
		echo IW_Frontend::markup( 'product' ); // phpcs:ignore WordPress.Security.EscapeOutput
		echo '<input type="hidden" name="iw_project_id" class="iw-project-id" value="">';
	}

	private static function posted_project_id() {
		$id = isset( $_POST['iw_project_id'] ) ? sanitize_text_field( wp_unslash( $_POST['iw_project_id'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		return IW_Storage::project_dir( $id ) ? $id : null;
	}

	public static function validate( $passed, $product_id ) {
		if ( self::enabled( $product_id ) && ! self::posted_project_id() ) {
			wc_add_notice( 'Najpierw przygotuj projekt wizytówki w konfiguratorze.', 'error' );
			return false;
		}
		return $passed;
	}

	public static function cart_item_data( $data, $product_id ) {
		if ( self::enabled( $product_id ) ) {
			$id = self::posted_project_id();
			if ( $id ) {
				$data['iw_project_id'] = $id; // Różne projekty = osobne pozycje w koszyku.
			}
		}
		return $data;
	}

	public static function display_item_data( $item_data, $cart_item ) {
		if ( empty( $cart_item['iw_project_id'] ) ) {
			return $item_data;
		}
		$p = IW_Storage::project_data( $cart_item['iw_project_id'] );
		if ( $p && ! empty( $p['username'] ) ) {
			$item_data[] = array( 'key' => 'Instagram', 'value' => '@' . $p['username'] );
		}
		return $item_data;
	}

	public static function cart_thumbnail( $thumb, $cart_item ) {
		if ( empty( $cart_item['iw_project_id'] ) ) {
			return $thumb;
		}
		$dir = IW_Storage::project_dir( $cart_item['iw_project_id'] );
		return $dir ? '<img src="' . esc_url( $dir[1] . '/front.png' ) . '" alt="Projekt wizytówki" style="max-width:64px;height:auto">' : $thumb;
	}

	public static function order_item_meta( $item, $cart_item_key, $values ) {
		if ( empty( $values['iw_project_id'] ) ) {
			return;
		}
		$id = $values['iw_project_id'];
		$item->add_meta_data( self::ITEM_META, $id, true );
		$p = IW_Storage::project_data( $id );
		if ( $p && ! empty( $p['username'] ) ) {
			$item->add_meta_data( 'Instagram', '@' . $p['username'], true );
		}
		IW_Storage::mark_ordered( $id, $item->get_order_id() ? $item->get_order_id() : 'pending' );
	}

	public static function hide_meta( $keys ) {
		$keys[] = self::ITEM_META;
		return $keys;
	}

	public static function admin_item_preview( $item_id, $item ) {
		$id  = $item->get_meta( self::ITEM_META );
		$dir = $id ? IW_Storage::project_dir( $id ) : null;
		if ( ! $dir ) {
			return;
		}
		IW_Storage::mark_ordered( $id, $item->get_order_id() );
		$link = wp_nonce_url( admin_url( 'admin-post.php?action=iw_download&id=' . $id ), 'iw_download_' . $id );
		echo '<div class="iw-admin-preview" style="margin-top:8px;display:flex;gap:8px;align-items:flex-start">';
		echo '<img src="' . esc_url( $dir[1] . '/front.png' ) . '" style="width:90px;border:1px solid #ddd">';
		echo '<img src="' . esc_url( $dir[1] . '/back.png' ) . '" style="width:90px;border:1px solid #ddd">';
		echo '<a class="button button-primary" href="' . esc_url( $link ) . '">Pobierz PDF do druku</a>';
		echo '</div>';
	}

	public static function download() {
		$id = isset( $_GET['id'] ) ? sanitize_text_field( wp_unslash( $_GET['id'] ) ) : '';
		if ( ! current_user_can( 'edit_shop_orders' ) || ! wp_verify_nonce( isset( $_GET['_wpnonce'] ) ? sanitize_text_field( wp_unslash( $_GET['_wpnonce'] ) ) : '', 'iw_download_' . $id ) ) {
			wp_die( 'Brak uprawnień.', 403 );
		}
		$dir = IW_Storage::project_dir( $id );
		if ( ! $dir || ! file_exists( $dir[0] . '/print.pdf' ) ) {
			wp_die( 'Nie znaleziono pliku.', 404 );
		}
		$p    = IW_Storage::project_data( $id );
		$name = 'wizytowka-' . ( $p && $p['username'] ? $p['username'] : $id ) . '.pdf';
		nocache_headers();
		header( 'Content-Type: application/pdf' );
		header( 'Content-Disposition: attachment; filename="' . $name . '"' );
		header( 'Content-Length: ' . filesize( $dir[0] . '/print.pdf' ) );
		readfile( $dir[0] . '/print.pdf' );
		exit;
	}
}
