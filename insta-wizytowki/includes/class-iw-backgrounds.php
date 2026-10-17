<?php
/**
 * Biblioteka teł okładki (strona 1): wpis „Tło” = obrazek wyróżniający + style (jasne, ciemne, złoto, roślinne…).
 * Tła dodajecie sami (np. pobrane z Magnific), konfigurator podpowiada klientowi pasujące do jego profilu.
 */

defined( 'ABSPATH' ) || exit;

class IW_Backgrounds {

	const CPT = 'iw_tlo';
	const TAX = 'iw_styl';

	/** Style domyślne – slug => nazwa. Konfigurator używa slugów do podpowiedzi. */
	const STYLES = array(
		'jasne'          => 'Jasne',
		'ciemne'         => 'Ciemne',
		'damskie'        => 'Damskie',
		'meskie'         => 'Męskie',
		'eleganckie'     => 'Eleganckie',
		'luksusowe'      => 'Luksusowe / premium',
		'zloto'          => 'Ze złotem',
		'marmur'         => 'Marmur',
		'neutralne'      => 'Neutralne',
		'roslinne'       => 'Roślinne',
		'minimalistyczne' => 'Minimalistyczne',
		'kolorowe'       => 'Kolorowe',
	);

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register' ) );
		add_filter( 'manage_' . self::CPT . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . self::CPT . '_posts_custom_column', array( __CLASS__, 'column' ), 10, 2 );
	}

	public static function register() {
		register_post_type(
			self::CPT,
			array(
				'labels'        => array(
					'name'          => 'Tła okładek',
					'singular_name' => 'Tło',
					'add_new'       => 'Dodaj tło',
					'add_new_item'  => 'Dodaj tło okładki',
					'edit_item'     => 'Edytuj tło',
					'featured_image' => 'Obraz tła (min. 1100×1700 px)',
					'set_featured_image' => 'Wybierz obraz tła',
				),
				'public'        => false,
				'show_ui'       => true,
				'show_in_menu'  => true,
				'menu_icon'     => 'dashicons-format-image',
				'menu_position' => 58,
				'supports'      => array( 'title', 'thumbnail' ),
			)
		);
		register_taxonomy(
			self::TAX,
			self::CPT,
			array(
				'labels'            => array( 'name' => 'Style', 'singular_name' => 'Styl' ),
				'public'            => false,
				'show_ui'           => true,
				'show_admin_column' => true,
				'hierarchical'      => true, // checkboxy w edycji tła.
			)
		);
	}

	public static function activate() {
		self::register();
		foreach ( self::STYLES as $slug => $name ) {
			if ( ! term_exists( $slug, self::TAX ) ) {
				wp_insert_term( $name, self::TAX, array( 'slug' => $slug ) );
			}
		}
	}

	public static function columns( $cols ) {
		return array_slice( $cols, 0, 1, true ) + array( 'iw_thumb' => 'Podgląd' ) + array_slice( $cols, 1, null, true );
	}

	public static function column( $col, $post_id ) {
		if ( 'iw_thumb' === $col ) {
			echo get_the_post_thumbnail( $post_id, array( 60, 90 ) );
		}
	}

	/** Lista teł dla konfiguratora. */
	public static function all() {
		$posts = get_posts(
			array(
				'post_type'   => self::CPT,
				'numberposts' => 200,
				'post_status' => 'publish',
				'orderby'     => 'menu_order title',
				'order'       => 'ASC',
			)
		);
		$out = array();
		foreach ( $posts as $p ) {
			$thumb_id = get_post_thumbnail_id( $p );
			if ( ! $thumb_id ) {
				continue;
			}
			$full  = wp_get_attachment_image_url( $thumb_id, 'full' );
			$small = wp_get_attachment_image_url( $thumb_id, 'medium' );
			$terms = wp_get_post_terms( $p->ID, self::TAX, array( 'fields' => 'slugs' ) );
			$out[] = array(
				'id'     => $p->ID,
				'title'  => $p->post_title,
				'url'    => $full,
				'thumb'  => $small ? $small : $full,
				'styles' => is_wp_error( $terms ) ? array() : $terms,
			);
		}
		return $out;
	}

	/** Nazwy stylów (slug => nazwa) – do filtrów w konfiguratorze. */
	public static function style_names() {
		$terms = get_terms( array( 'taxonomy' => self::TAX, 'hide_empty' => true ) );
		$out   = array();
		foreach ( is_wp_error( $terms ) ? array() : $terms as $t ) {
			$out[ $t->slug ] = $t->name;
		}
		return $out;
	}
}
