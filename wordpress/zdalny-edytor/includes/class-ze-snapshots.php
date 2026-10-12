<?php
/**
 * Migawki: zapis stanu przed każdą zmianą i przywracanie.
 *
 * Migawka to wpis typu `ze_snapshot`. Dane trzymamy w post_content jako
 * JSON zakodowany w base64, żeby filtry treści (kses, wp_unslash) ich nie zmieniały.
 */

defined( 'ABSPATH' ) || exit;

class ZE_Snapshots {

	const POST_TYPE = 'ze_snapshot';
	const MAX_KEEP  = 300;

	public static function register_post_type() {
		register_post_type(
			self::POST_TYPE,
			array(
				'public'       => false,
				'show_ui'      => false,
				'show_in_rest' => false,
				'rewrite'      => false,
				'query_var'    => false,
				'supports'     => array( 'title' ),
				'label'        => 'Migawki Zdalnego Edytora',
			)
		);
	}

	/**
	 * Zapisuje migawkę wpisu/strony/produktu.
	 *
	 * @param int        $post_id   ID wpisu.
	 * @param string     $reason    Opis zmiany.
	 * @param array|bool $meta_keys Lista kluczy meta do zapamiętania albo true = wszystkie.
	 * @return int|WP_Error ID migawki.
	 */
	public static function snapshot_post( $post_id, $reason, $meta_keys = array() ) {
		$post = get_post( $post_id );
		if ( ! $post ) {
			return new WP_Error( 'ze_not_found', 'Nie ma wpisu o ID ' . $post_id, array( 'status' => 404 ) );
		}

		$meta = array();
		if ( true === $meta_keys ) {
			foreach ( get_post_meta( $post_id ) as $key => $values ) {
				if ( in_array( $key, array( '_edit_lock', '_edit_last' ), true ) ) {
					continue;
				}
				$meta[ $key ] = array_map( 'maybe_unserialize', $values );
			}
		} else {
			foreach ( (array) $meta_keys as $key ) {
				$meta[ $key ] = metadata_exists( 'post', $post_id, $key )
					? array_map( 'maybe_unserialize', get_post_meta( $post_id, $key ) )
					: null;
			}
		}

		return self::store(
			'post',
			(string) $post_id,
			$reason,
			array(
				'post_title'   => $post->post_title,
				'post_content' => $post->post_content,
				'post_excerpt' => $post->post_excerpt,
				'post_status'  => $post->post_status,
				'post_name'    => $post->post_name,
				'post_parent'  => $post->post_parent,
				'menu_order'   => $post->menu_order,
				'meta'         => $meta,
			)
		);
	}

	public static function snapshot_option( $name, $reason ) {
		$missing = new stdClass();
		$value   = get_option( $name, $missing );
		return self::store(
			'option',
			$name,
			$reason,
			array(
				'exists' => $value !== $missing,
				'value'  => $value === $missing ? null : $value,
			)
		);
	}

	public static function snapshot_custom_css( $reason ) {
		return self::store(
			'custom_css',
			get_stylesheet(),
			$reason,
			array( 'css' => wp_get_custom_css() )
		);
	}

	private static function store( $type, $object, $reason, $data ) {
		$id = wp_insert_post(
			array(
				'post_type'    => self::POST_TYPE,
				'post_status'  => 'private',
				'post_title'   => wp_strip_all_tags( $reason ),
				'post_content' => base64_encode( wp_json_encode( $data ) ),
				'post_author'  => get_current_user_id(),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		update_post_meta( $id, '_ze_type', $type );
		update_post_meta( $id, '_ze_object', $object );
		self::prune();
		return $id;
	}

	private static function prune() {
		$old = get_posts(
			array(
				'post_type'      => self::POST_TYPE,
				'post_status'    => 'any',
				'orderby'        => 'ID',
				'order'          => 'DESC',
				'offset'         => self::MAX_KEEP,
				'posts_per_page' => 50,
				'fields'         => 'ids',
			)
		);
		foreach ( $old as $id ) {
			wp_delete_post( $id, true );
		}
	}

	public static function get( $id, $with_data = false ) {
		$post = get_post( $id );
		if ( ! $post || self::POST_TYPE !== $post->post_type ) {
			return null;
		}
		$item = array(
			'id'     => $post->ID,
			'date'   => $post->post_date,
			'type'   => get_post_meta( $post->ID, '_ze_type', true ),
			'object' => get_post_meta( $post->ID, '_ze_object', true ),
			'reason' => $post->post_title,
			'user'   => (int) $post->post_author,
		);
		if ( $with_data ) {
			$item['data'] = json_decode( base64_decode( $post->post_content ), true );
		}
		return $item;
	}

	public static function query( $args ) {
		$query = array(
			'post_type'      => self::POST_TYPE,
			'post_status'    => 'any',
			'orderby'        => 'ID',
			'order'          => 'DESC',
			'posts_per_page' => min( 100, max( 1, (int) ( $args['per_page'] ?? 20 ) ) ),
			'paged'          => max( 1, (int) ( $args['page'] ?? 1 ) ),
			'fields'         => 'ids',
		);
		$meta_query = array();
		if ( ! empty( $args['type'] ) ) {
			$meta_query[] = array( 'key' => '_ze_type', 'value' => $args['type'] );
		}
		if ( ! empty( $args['object'] ) ) {
			$meta_query[] = array( 'key' => '_ze_object', 'value' => (string) $args['object'] );
		}
		if ( $meta_query ) {
			$query['meta_query'] = $meta_query;
		}
		return array_map( array( __CLASS__, 'get' ), get_posts( $query ) );
	}

	/**
	 * Przywraca migawkę. Przed przywróceniem zapisuje bieżący stan, więc przywrócenie też da się cofnąć.
	 */
	public static function restore( $id ) {
		$snap = self::get( $id, true );
		if ( ! $snap || ! is_array( $snap['data'] ) ) {
			return new WP_Error( 'ze_not_found', 'Nie ma migawki o ID ' . $id, array( 'status' => 404 ) );
		}
		$data   = $snap['data'];
		$reason = 'Przed przywróceniem migawki #' . $id;

		switch ( $snap['type'] ) {
			case 'post':
				$post_id = (int) $snap['object'];
				if ( ! get_post( $post_id ) ) {
					return new WP_Error( 'ze_not_found', 'Wpis ' . $post_id . ' już nie istnieje.', array( 'status' => 404 ) );
				}
				$before = self::snapshot_post( $post_id, $reason, empty( $data['meta'] ) ? array() : array_keys( $data['meta'] ) );
				$result = wp_update_post(
					wp_slash(
						array(
							'ID'           => $post_id,
							'post_title'   => $data['post_title'],
							'post_content' => $data['post_content'],
							'post_excerpt' => $data['post_excerpt'],
							'post_status'  => $data['post_status'],
							'post_name'    => $data['post_name'],
							'post_parent'  => $data['post_parent'],
							'menu_order'   => $data['menu_order'],
						)
					),
					true
				);
				if ( is_wp_error( $result ) ) {
					return $result;
				}
				foreach ( (array) $data['meta'] as $key => $values ) {
					delete_post_meta( $post_id, $key );
					if ( null === $values ) {
						continue;
					}
					foreach ( $values as $value ) {
						add_post_meta( $post_id, $key, wp_slash( $value ) );
					}
				}
				if ( 'product' === get_post_type( $post_id ) && function_exists( 'wc_get_product' ) ) {
					wc_delete_product_transients( $post_id );
					$product = wc_get_product( $post_id );
					if ( $product ) {
						$product->save();
					}
				}
				clean_post_cache( $post_id );
				break;

			case 'option':
				$before = self::snapshot_option( $snap['object'], $reason );
				if ( $data['exists'] ) {
					update_option( $snap['object'], $data['value'] );
				} else {
					delete_option( $snap['object'] );
				}
				break;

			case 'custom_css':
				$before = self::snapshot_custom_css( $reason );
				$result = wp_update_custom_css_post( (string) $data['css'], array( 'stylesheet' => $snap['object'] ) );
				if ( is_wp_error( $result ) ) {
					return $result;
				}
				break;

			default:
				return new WP_Error( 'ze_bad_snapshot', 'Nieznany typ migawki.', array( 'status' => 400 ) );
		}

		return array(
			'restored'        => $id,
			'snapshot_before' => is_wp_error( $before ) ? null : $before,
		);
	}
}
