<?php
/**
 * Endpointy REST: /wp-json/zdalny-edytor/v1/...
 *
 * Uwierzytelnianie: hasła aplikacji WordPressa (Użytkownicy → Profil → Hasła aplikacji).
 * Dostęp ma tylko użytkownik z uprawnieniem manage_options (administrator).
 */

defined( 'ABSPATH' ) || exit;

class ZE_Rest {

	/** Opcje, których nie wolno zmieniać przez API (łatwo nimi „zabić” stronę). */
	const PROTECTED_OPTIONS = array(
		'siteurl',
		'home',
		'active_plugins',
		'template',
		'stylesheet',
		'admin_email',
		'users_can_register',
		'default_role',
		'wp_user_roles',
		'ze_enabled',
	);

	/** Znane klucze meta Astry ustawiane per strona/wpis. */
	const ASTRA_META_KEYS = array(
		'site-sidebar-layout',
		'site-content-layout',
		'ast-site-content-layout',
		'site-content-style',
		'site-sidebar-style',
		'ast-global-header-display',
		'ast-main-header-display',
		'ast-hfb-above-header-display',
		'ast-hfb-below-header-display',
		'ast-hfb-mobile-header-display',
		'site-post-title',
		'ast-banner-title-visibility',
		'ast-breadcrumbs-content',
		'ast-featured-img',
		'footer-sml-layout',
		'footer-adv-display',
		'theme-transparent-header-meta',
		'stick-header-meta',
	);

	public static function register_routes() {
		$ns   = ZE_NAMESPACE;
		$auth = array( __CLASS__, 'permission' );
		$id   = '(?P<id>\d+)';

		register_rest_route( $ns, '/info', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'info' ), 'permission_callback' => $auth ) );

		register_rest_route( $ns, '/content', array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'list_content' ), 'permission_callback' => $auth ) );

		register_rest_route(
			$ns,
			'/posts',
			array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'create_post' ), 'permission_callback' => $auth )
		);
		register_rest_route(
			$ns,
			'/posts/' . $id,
			array(
				array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'get_post' ), 'permission_callback' => $auth ),
				array( 'methods' => 'PUT, PATCH, POST', 'callback' => array( __CLASS__, 'update_post' ), 'permission_callback' => $auth ),
				array( 'methods' => 'DELETE', 'callback' => array( __CLASS__, 'trash_post' ), 'permission_callback' => $auth ),
			)
		);
		register_rest_route( $ns, '/posts/' . $id . '/blocks', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'block_ops' ), 'permission_callback' => $auth ) );
		register_rest_route( $ns, '/posts/' . $id . '/duplicate', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'duplicate_post' ), 'permission_callback' => $auth ) );

		register_rest_route( $ns, '/search-replace', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'search_replace' ), 'permission_callback' => $auth ) );

		register_rest_route(
			$ns,
			'/astra/settings',
			array(
				array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'get_astra_settings' ), 'permission_callback' => $auth ),
				array( 'methods' => 'POST, PATCH', 'callback' => array( __CLASS__, 'update_astra_settings' ), 'permission_callback' => $auth ),
			)
		);
		register_rest_route(
			$ns,
			'/theme-mods',
			array(
				array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'get_theme_mods' ), 'permission_callback' => $auth ),
				array( 'methods' => 'POST, PATCH', 'callback' => array( __CLASS__, 'update_theme_mods' ), 'permission_callback' => $auth ),
			)
		);
		register_rest_route(
			$ns,
			'/css',
			array(
				array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'get_css' ), 'permission_callback' => $auth ),
				array( 'methods' => 'POST, PUT', 'callback' => array( __CLASS__, 'update_css' ), 'permission_callback' => $auth ),
			)
		);
		register_rest_route(
			$ns,
			'/options',
			array(
				array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'get_options' ), 'permission_callback' => $auth ),
				array( 'methods' => 'POST, PATCH', 'callback' => array( __CLASS__, 'update_options' ), 'permission_callback' => $auth ),
			)
		);

		register_rest_route( $ns, '/media/sideload', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'sideload_media' ), 'permission_callback' => $auth ) );

		register_rest_route(
			$ns,
			'/snapshots',
			array(
				array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'list_snapshots' ), 'permission_callback' => $auth ),
				array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'create_snapshot' ), 'permission_callback' => $auth ),
			)
		);
		register_rest_route( $ns, '/snapshots/' . $id, array( 'methods' => 'GET', 'callback' => array( __CLASS__, 'get_snapshot' ), 'permission_callback' => $auth ) );
		register_rest_route( $ns, '/snapshots/' . $id . '/restore', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'restore_snapshot' ), 'permission_callback' => $auth ) );

		register_rest_route( $ns, '/cache/flush', array( 'methods' => 'POST', 'callback' => array( __CLASS__, 'flush_cache' ), 'permission_callback' => $auth ) );
	}

	public static function permission() {
		if ( ! get_option( 'ze_enabled', 1 ) ) {
			return new WP_Error( 'ze_disabled', 'Zdalny Edytor jest wyłączony w ustawieniach wtyczki.', array( 'status' => 403 ) );
		}
		if ( ! is_user_logged_in() ) {
			return new WP_Error( 'ze_unauthorized', 'Brak uwierzytelnienia. Użyj hasła aplikacji (Basic Auth).', array( 'status' => 401 ) );
		}
		if ( ! current_user_can( 'manage_options' ) ) {
			return new WP_Error( 'ze_forbidden', 'Wymagane uprawnienia administratora.', array( 'status' => 403 ) );
		}
		return true;
	}

	/* ---------------------------------------------------------------------
	 * Informacje o stronie
	 * ------------------------------------------------------------------- */

	public static function info() {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}
		$theme   = wp_get_theme();
		$active  = (array) get_option( 'active_plugins', array() );
		$plugins = array();
		foreach ( get_plugins() as $file => $data ) {
			$plugins[] = array(
				'file'    => $file,
				'name'    => $data['Name'],
				'version' => $data['Version'],
				'active'  => in_array( $file, $active, true ) || is_plugin_active_for_network( $file ),
			);
		}

		$counts = array();
		foreach ( get_post_types( array( 'show_ui' => true ), 'objects' ) as $type ) {
			$c = wp_count_posts( $type->name );
			if ( isset( $c->publish ) || isset( $c->draft ) ) {
				$counts[ $type->name ] = array(
					'label'   => $type->label,
					'publish' => (int) ( $c->publish ?? 0 ),
					'draft'   => (int) ( $c->draft ?? 0 ),
					'private' => (int) ( $c->private ?? 0 ),
				);
			}
		}

		$menus = array();
		foreach ( wp_get_nav_menus() as $menu ) {
			$menus[] = array( 'id' => $menu->term_id, 'name' => $menu->name, 'items' => (int) $menu->count );
		}

		return array(
			'plugin_version' => ZE_VERSION,
			'site'           => array(
				'name'        => get_bloginfo( 'name' ),
				'description' => get_bloginfo( 'description' ),
				'url'         => home_url( '/' ),
				'language'    => get_locale(),
				'timezone'    => wp_timezone_string(),
				'wp_version'  => get_bloginfo( 'version' ),
				'php_version' => PHP_VERSION,
				'permalinks'  => get_option( 'permalink_structure' ),
			),
			'reading'        => array(
				'show_on_front'  => get_option( 'show_on_front' ),
				'page_on_front'  => (int) get_option( 'page_on_front' ),
				'page_for_posts' => (int) get_option( 'page_for_posts' ),
			),
			'theme'          => array(
				'name'           => $theme->get( 'Name' ),
				'version'        => $theme->get( 'Version' ),
				'stylesheet'     => get_stylesheet(),
				'template'       => get_template(),
				'is_astra'       => 'astra' === get_template(),
				'astra_pro'      => defined( 'ASTRA_EXT_VER' ) ? ASTRA_EXT_VER : false,
				'astra_css_file' => get_option( '_astra_file_generation', 'disable' ),
				'is_block_theme' => function_exists( 'wp_is_block_theme' ) && wp_is_block_theme(),
				'page_templates' => $theme->get_page_templates(),
				'menu_locations' => get_registered_nav_menus(),
				'menu_assigned'  => get_nav_menu_locations(),
			),
			'astra_meta_keys' => self::ASTRA_META_KEYS,
			'woocommerce'    => class_exists( 'WooCommerce' ) ? WC()->version : false,
			'spectra'        => defined( 'UAGB_VER' ) ? UAGB_VER : false,
			'plugins'        => $plugins,
			'content_counts' => $counts,
			'menus'          => $menus,
		);
	}

	/* ---------------------------------------------------------------------
	 * Treści: strony, wpisy, produkty, dowolne typy
	 * ------------------------------------------------------------------- */

	public static function list_content( WP_REST_Request $request ) {
		$type  = $request->get_param( 'type' ) ?: array( 'page', 'post' );
		$query = new WP_Query(
			array(
				'post_type'      => $type,
				'post_status'    => $request->get_param( 'status' ) ?: array( 'publish', 'draft', 'pending', 'private', 'future' ),
				's'              => (string) $request->get_param( 'search' ),
				'posts_per_page' => min( 100, max( 1, (int) ( $request->get_param( 'per_page' ) ?: 50 ) ) ),
				'paged'          => max( 1, (int) $request->get_param( 'page' ) ),
				'orderby'        => $request->get_param( 'orderby' ) ?: 'modified',
				'order'          => 'DESC',
			)
		);
		$items = array();
		foreach ( $query->posts as $post ) {
			$items[] = array(
				'id'       => $post->ID,
				'type'     => $post->post_type,
				'title'    => $post->post_title,
				'status'   => $post->post_status,
				'slug'     => $post->post_name,
				'parent'   => $post->post_parent,
				'link'     => get_permalink( $post ),
				'modified' => $post->post_modified,
			);
		}
		return array(
			'total' => (int) $query->found_posts,
			'pages' => (int) $query->max_num_pages,
			'items' => $items,
		);
	}

	private static function require_post( $id ) {
		$post = get_post( (int) $id );
		if ( ! $post || ZE_Snapshots::POST_TYPE === $post->post_type ) {
			return new WP_Error( 'ze_not_found', 'Nie ma wpisu o ID ' . $id, array( 'status' => 404 ) );
		}
		return $post;
	}

	public static function get_post( WP_REST_Request $request ) {
		$post = self::require_post( $request['id'] );
		if ( is_wp_error( $post ) ) {
			return $post;
		}
		$format = $request->get_param( 'format' ) ?: 'full';

		$meta = array();
		foreach ( get_post_meta( $post->ID ) as $key => $values ) {
			if ( in_array( $key, array( '_edit_lock', '_edit_last' ), true ) ) {
				continue;
			}
			$values       = array_map( 'maybe_unserialize', $values );
			$meta[ $key ] = 1 === count( $values ) ? $values[0] : $values;
		}

		$data = array(
			'id'             => $post->ID,
			'type'           => $post->post_type,
			'title'          => $post->post_title,
			'status'         => $post->post_status,
			'slug'           => $post->post_name,
			'parent'         => $post->post_parent,
			'menu_order'     => $post->menu_order,
			'excerpt'        => $post->post_excerpt,
			'link'           => get_permalink( $post ),
			'template'       => get_page_template_slug( $post ),
			'featured_media' => (int) get_post_thumbnail_id( $post ),
			'modified'       => $post->post_modified,
			'meta'           => (object) $meta,
		);

		if ( 'outline' !== $format ) {
			$data['content'] = $post->post_content;
		}
		if ( 'raw' !== $format ) {
			$data['blocks'] = ZE_Blocks::outline( ZE_Blocks::parse( $post->post_content ), '', 'outline' !== $format );
		}
		return $data;
	}

	/**
	 * Zamienia parametry żądania na pola wp_insert_post / wp_update_post.
	 */
	private static function post_fields( WP_REST_Request $request ) {
		$map    = array(
			'title'      => 'post_title',
			'content'    => 'post_content',
			'excerpt'    => 'post_excerpt',
			'status'     => 'post_status',
			'slug'       => 'post_name',
			'parent'     => 'post_parent',
			'menu_order' => 'menu_order',
			'date'       => 'post_date',
		);
		$fields = array();
		foreach ( $map as $param => $field ) {
			if ( null !== $request->get_param( $param ) ) {
				$fields[ $field ] = $request->get_param( $param );
			}
		}
		return $fields;
	}

	private static function apply_post_extras( $post_id, WP_REST_Request $request ) {
		if ( null !== $request->get_param( 'template' ) ) {
			update_post_meta( $post_id, '_wp_page_template', $request->get_param( 'template' ) ?: 'default' );
		}
		if ( null !== $request->get_param( 'featured_media' ) ) {
			$media = (int) $request->get_param( 'featured_media' );
			$media ? set_post_thumbnail( $post_id, $media ) : delete_post_thumbnail( $post_id );
		}
		foreach ( array( 'categories' => 'category', 'tags' => 'post_tag' ) as $param => $taxonomy ) {
			if ( null !== $request->get_param( $param ) ) {
				wp_set_post_terms( $post_id, (array) $request->get_param( $param ), $taxonomy );
			}
		}
		$meta = $request->get_param( 'meta' );
		if ( is_array( $meta ) ) {
			foreach ( $meta as $key => $value ) {
				if ( null === $value ) {
					delete_post_meta( $post_id, $key );
				} else {
					update_post_meta( $post_id, $key, wp_slash( $value ) );
				}
			}
		}
	}

	public static function create_post( WP_REST_Request $request ) {
		$fields              = self::post_fields( $request );
		$fields['post_type'] = $request->get_param( 'type' ) ?: 'page';
		if ( ! post_type_exists( $fields['post_type'] ) ) {
			return new WP_Error( 'ze_bad_type', 'Nieznany typ treści: ' . $fields['post_type'], array( 'status' => 400 ) );
		}
		$fields += array( 'post_status' => 'draft' );

		$id = wp_insert_post( wp_slash( $fields ), true );
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		self::apply_post_extras( $id, $request );

		return array(
			'id'     => $id,
			'link'   => get_permalink( $id ),
			'status' => get_post_status( $id ),
			'edit'   => get_edit_post_link( $id, 'raw' ),
		);
	}

	public static function update_post( WP_REST_Request $request ) {
		$post = self::require_post( $request['id'] );
		if ( is_wp_error( $post ) ) {
			return $post;
		}
		$meta_keys = array();
		if ( is_array( $request->get_param( 'meta' ) ) ) {
			$meta_keys = array_keys( $request->get_param( 'meta' ) );
		}
		if ( null !== $request->get_param( 'template' ) ) {
			$meta_keys[] = '_wp_page_template';
		}
		if ( null !== $request->get_param( 'featured_media' ) ) {
			$meta_keys[] = '_thumbnail_id';
		}
		$snapshot = ZE_Snapshots::snapshot_post( $post->ID, $request->get_param( 'reason' ) ?: 'Edycja wpisu #' . $post->ID, $meta_keys );

		$fields = self::post_fields( $request );
		if ( $fields ) {
			$fields['ID'] = $post->ID;
			$result       = wp_update_post( wp_slash( $fields ), true );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
		}
		self::apply_post_extras( $post->ID, $request );
		clean_post_cache( $post->ID );

		return array(
			'id'       => $post->ID,
			'link'     => get_permalink( $post->ID ),
			'status'   => get_post_status( $post->ID ),
			'snapshot' => is_wp_error( $snapshot ) ? null : $snapshot,
		);
	}

	public static function trash_post( WP_REST_Request $request ) {
		$post = self::require_post( $request['id'] );
		if ( is_wp_error( $post ) ) {
			return $post;
		}
		if ( ! wp_trash_post( $post->ID ) ) {
			return new WP_Error( 'ze_trash_failed', 'Nie udało się przenieść do kosza.', array( 'status' => 500 ) );
		}
		return array( 'id' => $post->ID, 'status' => 'trash' );
	}

	public static function duplicate_post( WP_REST_Request $request ) {
		$post = self::require_post( $request['id'] );
		if ( is_wp_error( $post ) ) {
			return $post;
		}
		$new_id = wp_insert_post(
			wp_slash(
				array(
					'post_type'    => $post->post_type,
					'post_title'   => $request->get_param( 'title' ) ?: $post->post_title . ' (kopia)',
					'post_content' => $post->post_content,
					'post_excerpt' => $post->post_excerpt,
					'post_parent'  => $post->post_parent,
					'menu_order'   => $post->menu_order,
					'post_status'  => 'draft',
				)
			),
			true
		);
		if ( is_wp_error( $new_id ) ) {
			return $new_id;
		}
		foreach ( get_post_meta( $post->ID ) as $key => $values ) {
			if ( in_array( $key, array( '_edit_lock', '_edit_last', '_wp_old_slug' ), true ) ) {
				continue;
			}
			foreach ( $values as $value ) {
				add_post_meta( $new_id, $key, wp_slash( maybe_unserialize( $value ) ) );
			}
		}
		foreach ( get_object_taxonomies( $post->post_type ) as $taxonomy ) {
			wp_set_object_terms( $new_id, wp_get_object_terms( $post->ID, $taxonomy, array( 'fields' => 'ids' ) ), $taxonomy );
		}
		return array( 'id' => $new_id, 'link' => get_permalink( $new_id ), 'status' => 'draft' );
	}

	/* ---------------------------------------------------------------------
	 * Bloki Gutenberga
	 * ------------------------------------------------------------------- */

	public static function block_ops( WP_REST_Request $request ) {
		$post = self::require_post( $request['id'] );
		if ( is_wp_error( $post ) ) {
			return $post;
		}
		$ops = $request->get_param( 'ops' );
		if ( ! is_array( $ops ) || ! $ops ) {
			return new WP_Error( 'ze_no_ops', 'Podaj listę operacji w polu "ops".', array( 'status' => 400 ) );
		}

		$result = ZE_Blocks::apply_ops( ZE_Blocks::parse( $post->post_content ), $ops );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		$content = ZE_Blocks::serialize( $result['blocks'] );

		if ( $request->get_param( 'dry_run' ) ) {
			return array(
				'dry_run' => true,
				'report'  => $result['report'],
				'content' => $content,
				'blocks'  => ZE_Blocks::outline( $result['blocks'], '', false ),
			);
		}

		$snapshot = ZE_Snapshots::snapshot_post( $post->ID, $request->get_param( 'reason' ) ?: 'Operacje na blokach #' . $post->ID );
		$updated  = wp_update_post(
			wp_slash(
				array(
					'ID'           => $post->ID,
					'post_content' => $content,
				)
			),
			true
		);
		if ( is_wp_error( $updated ) ) {
			return $updated;
		}
		return array(
			'id'       => $post->ID,
			'report'   => $result['report'],
			'snapshot' => is_wp_error( $snapshot ) ? null : $snapshot,
			'blocks'   => ZE_Blocks::outline( ZE_Blocks::parse( get_post_field( 'post_content', $post->ID ) ), '', false ),
		);
	}

	/* ---------------------------------------------------------------------
	 * Wyszukaj i zamień w treściach
	 * ------------------------------------------------------------------- */

	public static function search_replace( WP_REST_Request $request ) {
		$find    = (string) $request->get_param( 'find' );
		$replace = (string) $request->get_param( 'replace' );
		$regex   = (bool) $request->get_param( 'regex' );
		$dry_run = false !== $request->get_param( 'dry_run' ) && 'false' !== $request->get_param( 'dry_run' );
		$fields  = $request->get_param( 'fields' ) ?: array( 'post_content', 'post_title', 'post_excerpt' );
		$types   = $request->get_param( 'types' ) ?: array( 'page', 'post' );

		if ( '' === $find ) {
			return new WP_Error( 'ze_bad_request', 'Pole "find" jest wymagane.', array( 'status' => 400 ) );
		}
		if ( $regex && false === @preg_match( $find, '' ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors
			return new WP_Error( 'ze_bad_regex', 'Nieprawidłowe wyrażenie regularne (podaj z ogranicznikami, np. /tekst/u).', array( 'status' => 400 ) );
		}
		$fields = array_intersect( (array) $fields, array( 'post_content', 'post_title', 'post_excerpt' ) );

		$ids = get_posts(
			array(
				'post_type'      => $types,
				'post_status'    => array( 'publish', 'draft', 'pending', 'private', 'future' ),
				'posts_per_page' => -1,
				'fields'         => 'ids',
			)
		);

		$changes = array();
		$total   = 0;
		foreach ( $ids as $id ) {
			$post   = get_post( $id );
			$update = array();
			$hits   = 0;
			foreach ( $fields as $field ) {
				$old = $post->$field;
				$n   = 0;
				$new = $regex ? preg_replace( $find, $replace, $old, -1, $n ) : str_replace( $find, $replace, $old, $n );
				if ( $n > 0 && null !== $new ) {
					$update[ $field ] = $new;
					$hits            += $n;
				}
			}
			if ( ! $update ) {
				continue;
			}
			$total += $hits;
			$entry  = array(
				'id'      => $id,
				'type'    => $post->post_type,
				'title'   => $post->post_title,
				'matches' => $hits,
				'fields'  => array_keys( $update ),
			);
			if ( ! $dry_run ) {
				$snap              = ZE_Snapshots::snapshot_post( $id, 'Wyszukaj i zamień: ' . mb_substr( $find, 0, 60 ) );
				$entry['snapshot'] = is_wp_error( $snap ) ? null : $snap;
				$update['ID']      = $id;
				wp_update_post( wp_slash( $update ) );
			}
			$changes[] = $entry;
		}

		return array(
			'dry_run'       => $dry_run,
			'posts_changed' => count( $changes ),
			'total_matches' => $total,
			'changes'       => $changes,
		);
	}

	/* ---------------------------------------------------------------------
	 * Astra, theme mods, CSS, opcje
	 * ------------------------------------------------------------------- */

	/**
	 * Scala tablicę: wartość null usuwa klucz.
	 */
	private static function merge_values( array $base, array $changes ) {
		foreach ( $changes as $key => $value ) {
			if ( null === $value ) {
				unset( $base[ $key ] );
			} else {
				$base[ $key ] = $value;
			}
		}
		return $base;
	}

	public static function get_astra_settings( WP_REST_Request $request ) {
		$settings = (array) get_option( 'astra-settings', array() );
		$keys     = $request->get_param( 'keys' );
		$search   = (string) $request->get_param( 'search' );
		if ( $keys ) {
			$settings = array_intersect_key( $settings, array_flip( (array) $keys ) );
		} elseif ( '' !== $search ) {
			$settings = array_filter(
				$settings,
				function ( $key ) use ( $search ) {
					return false !== stripos( $key, $search );
				},
				ARRAY_FILTER_USE_KEY
			);
		}
		ksort( $settings );
		return array(
			'is_astra' => 'astra' === get_template(),
			'count'    => count( $settings ),
			'settings' => (object) $settings,
		);
	}

	public static function update_astra_settings( WP_REST_Request $request ) {
		$changes = $request->get_param( 'settings' );
		if ( ! is_array( $changes ) || ! $changes ) {
			return new WP_Error( 'ze_bad_request', 'Podaj obiekt "settings" z kluczami do zmiany.', array( 'status' => 400 ) );
		}
		$snapshot = ZE_Snapshots::snapshot_option( 'astra-settings', $request->get_param( 'reason' ) ?: 'Ustawienia Astry' );
		$settings = self::merge_values( (array) get_option( 'astra-settings', array() ), $changes );
		update_option( 'astra-settings', $settings );
		return array(
			'updated'  => array_keys( $changes ),
			'snapshot' => is_wp_error( $snapshot ) ? null : $snapshot,
		);
	}

	public static function get_theme_mods() {
		return array(
			'stylesheet' => get_stylesheet(),
			'mods'       => (object) ( get_theme_mods() ?: array() ),
		);
	}

	public static function update_theme_mods( WP_REST_Request $request ) {
		$changes = $request->get_param( 'mods' );
		if ( ! is_array( $changes ) || ! $changes ) {
			return new WP_Error( 'ze_bad_request', 'Podaj obiekt "mods".', array( 'status' => 400 ) );
		}
		$snapshot = ZE_Snapshots::snapshot_option( 'theme_mods_' . get_stylesheet(), $request->get_param( 'reason' ) ?: 'Theme mods' );
		foreach ( $changes as $key => $value ) {
			null === $value ? remove_theme_mod( $key ) : set_theme_mod( $key, $value );
		}
		return array(
			'updated'  => array_keys( $changes ),
			'snapshot' => is_wp_error( $snapshot ) ? null : $snapshot,
		);
	}

	public static function get_css() {
		return array( 'css' => wp_get_custom_css() );
	}

	public static function update_css( WP_REST_Request $request ) {
		$css  = (string) $request->get_param( 'css' );
		$mode = $request->get_param( 'mode' ) ?: 'replace';
		if ( 'append' === $mode ) {
			$css = rtrim( wp_get_custom_css() ) . "\n\n" . $css;
		} elseif ( 'replace' !== $mode ) {
			return new WP_Error( 'ze_bad_request', 'mode musi być "replace" albo "append".', array( 'status' => 400 ) );
		}
		$snapshot = ZE_Snapshots::snapshot_custom_css( $request->get_param( 'reason' ) ?: 'Dodatkowy CSS' );
		$result   = wp_update_custom_css_post( $css );
		if ( is_wp_error( $result ) ) {
			return $result;
		}
		return array(
			'length'   => strlen( $css ),
			'snapshot' => is_wp_error( $snapshot ) ? null : $snapshot,
		);
	}

	public static function get_options( WP_REST_Request $request ) {
		$names = $request->get_param( 'names' );
		if ( is_string( $names ) ) {
			$names = array_filter( array_map( 'trim', explode( ',', $names ) ) );
		}
		if ( ! $names ) {
			return new WP_Error( 'ze_bad_request', 'Podaj nazwy opcji w parametrze "names" (oddzielone przecinkami).', array( 'status' => 400 ) );
		}
		$out = array();
		foreach ( (array) $names as $name ) {
			$out[ $name ] = get_option( $name, null );
		}
		return array( 'options' => (object) $out );
	}

	public static function update_options( WP_REST_Request $request ) {
		$values = $request->get_param( 'options' );
		if ( ! is_array( $values ) || ! $values ) {
			return new WP_Error( 'ze_bad_request', 'Podaj obiekt "options".', array( 'status' => 400 ) );
		}
		$blocked = array_intersect( array_keys( $values ), self::PROTECTED_OPTIONS );
		if ( $blocked ) {
			return new WP_Error( 'ze_protected', 'Tych opcji nie można zmieniać przez API: ' . implode( ', ', $blocked ), array( 'status' => 403 ) );
		}
		$snapshots = array();
		foreach ( $values as $name => $value ) {
			$snap               = ZE_Snapshots::snapshot_option( $name, $request->get_param( 'reason' ) ?: 'Opcja ' . $name );
			$snapshots[ $name ] = is_wp_error( $snap ) ? null : $snap;
			null === $value ? delete_option( $name ) : update_option( $name, $value );
		}
		return array( 'updated' => array_keys( $values ), 'snapshots' => (object) $snapshots );
	}

	/* ---------------------------------------------------------------------
	 * Media
	 * ------------------------------------------------------------------- */

	public static function sideload_media( WP_REST_Request $request ) {
		$url = esc_url_raw( (string) $request->get_param( 'url' ) );
		if ( ! $url || ! wp_http_validate_url( $url ) ) {
			return new WP_Error( 'ze_bad_url', 'Podaj poprawny publiczny adres URL pliku.', array( 'status' => 400 ) );
		}
		require_once ABSPATH . 'wp-admin/includes/media.php';
		require_once ABSPATH . 'wp-admin/includes/file.php';
		require_once ABSPATH . 'wp-admin/includes/image.php';

		$post_id = (int) $request->get_param( 'post_id' );
		$tmp     = download_url( $url, 60 );
		if ( is_wp_error( $tmp ) ) {
			return $tmp;
		}
		$name = $request->get_param( 'filename' ) ?: wp_basename( wp_parse_url( $url, PHP_URL_PATH ) );
		$id   = media_handle_sideload(
			array(
				'name'     => sanitize_file_name( $name ),
				'tmp_name' => $tmp,
			),
			$post_id,
			$request->get_param( 'title' )
		);
		if ( is_wp_error( $id ) ) {
			@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			return $id;
		}
		if ( $request->get_param( 'alt' ) ) {
			update_post_meta( $id, '_wp_attachment_image_alt', sanitize_text_field( $request->get_param( 'alt' ) ) );
		}
		if ( $post_id && $request->get_param( 'set_featured' ) ) {
			set_post_thumbnail( $post_id, $id );
		}
		return array(
			'id'  => $id,
			'url' => wp_get_attachment_url( $id ),
		);
	}

	/* ---------------------------------------------------------------------
	 * Migawki
	 * ------------------------------------------------------------------- */

	public static function list_snapshots( WP_REST_Request $request ) {
		return ZE_Snapshots::query( $request->get_params() );
	}

	public static function get_snapshot( WP_REST_Request $request ) {
		$snap = ZE_Snapshots::get( (int) $request['id'], true );
		return $snap ?: new WP_Error( 'ze_not_found', 'Nie ma takiej migawki.', array( 'status' => 404 ) );
	}

	public static function create_snapshot( WP_REST_Request $request ) {
		$reason = $request->get_param( 'reason' ) ?: 'Ręczna migawka';
		switch ( $request->get_param( 'type' ) ) {
			case 'post':
				$id = ZE_Snapshots::snapshot_post( (int) $request->get_param( 'object' ), $reason, true );
				break;
			case 'option':
				$id = ZE_Snapshots::snapshot_option( (string) $request->get_param( 'object' ), $reason );
				break;
			case 'custom_css':
				$id = ZE_Snapshots::snapshot_custom_css( $reason );
				break;
			default:
				return new WP_Error( 'ze_bad_request', 'type musi być: post, option albo custom_css.', array( 'status' => 400 ) );
		}
		return is_wp_error( $id ) ? $id : array( 'snapshot' => $id );
	}

	public static function restore_snapshot( WP_REST_Request $request ) {
		return ZE_Snapshots::restore( (int) $request['id'] );
	}

	/* ---------------------------------------------------------------------
	 * Pamięć podręczna
	 * ------------------------------------------------------------------- */

	public static function flush_cache() {
		wp_cache_flush();
		$done = array( 'object_cache' );

		if ( has_action( 'litespeed_purge_all' ) ) {
			do_action( 'litespeed_purge_all' );
			$done[] = 'litespeed';
		}
		$functions = array( 'w3tc_flush_all', 'rocket_clean_domain', 'wp_cache_clear_cache', 'sg_cachepress_purge_cache', 'wpfc_clear_all_cache' );
		foreach ( $functions as $fn ) {
			if ( function_exists( $fn ) ) {
				call_user_func( $fn );
				$done[] = $fn;
			}
		}
		if ( class_exists( 'autoptimizeCache' ) && method_exists( 'autoptimizeCache', 'clearall' ) ) {
			autoptimizeCache::clearall();
			$done[] = 'autoptimize';
		}
		return array( 'flushed' => $done );
	}
}
