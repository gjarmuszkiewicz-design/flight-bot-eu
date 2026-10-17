<?php
/**
 * Pobieranie profilu Instagram z wybranego źródła i sprowadzanie do wspólnego formatu.
 *
 * Wspólny format profilu:
 * [
 *   'username', 'full_name', 'category', 'biography', 'website', 'avatar',
 *   'is_verified', 'is_private',
 *   'counts'     => [ 'posts', 'followers', 'following' ],
 *   'highlights' => [ [ 'title', 'image' ], ... ],
 *   'posts'      => [ [ 'image', 'type' ], ... ]   // maks. 9
 *   'source'
 * ]
 */

defined( 'ABSPATH' ) || exit;

class IW_Profile_Fetcher {

	const MAX_POSTS      = 9;
	const MAX_HIGHLIGHTS = 5;

	/** Wyciąga nazwę użytkownika z linku, @nazwy lub samej nazwy. */
	public static function normalize_username( $input ) {
		$input = trim( (string) $input );
		if ( preg_match( '~instagram\.com/([^/?#]+)~i', $input, $m ) ) {
			$input = $m[1];
		}
		$input = strtolower( ltrim( $input, '@' ) );
		return preg_match( '/^[a-z0-9._]{1,30}$/', $input ) ? $input : null;
	}

	/** @return array|WP_Error */
	public static function get( $username ) {
		$cache_key = 'iw_profile_' . md5( $username . '|' . IW_Settings::get( 'provider' ) );
		$cached    = get_transient( $cache_key );
		if ( is_array( $cached ) ) {
			return $cached;
		}

		$chain = array_unique( array_filter( array( IW_Settings::get( 'provider' ), IW_Settings::get( 'fallback_provider' ) ), fn( $p ) => $p && 'none' !== $p ) );
		$error = new WP_Error( 'iw_no_provider', 'Brak skonfigurowanego źródła danych.' );

		foreach ( $chain as $provider ) {
			$profile = self::fetch_from( $provider, $username );
			if ( is_wp_error( $profile ) ) {
				$error = $profile;
				// Prywatny albo nieistniejący profil nie zmieni się u innego dostawcy.
				if ( in_array( $profile->get_error_code(), array( 'iw_not_found', 'iw_private' ), true ) && 'business_discovery' !== $provider ) {
					break;
				}
				continue;
			}
			$profile = self::localize( self::clean( $profile ) );
			set_transient( $cache_key, $profile, max( 1, (int) IW_Settings::get( 'cache_hours' ) ) * HOUR_IN_SECONDS );
			return $profile;
		}
		return $error;
	}

	private static function fetch_from( $provider, $username ) {
		switch ( $provider ) {
			case 'hikerapi':
				return self::from_hikerapi( $username );
			case 'business_discovery':
				return self::from_business_discovery( $username );
			default:
				return self::from_demo( $username );
		}
	}

	private static function clean( array $p ) {
		$p['posts']      = array_slice( array_values( $p['posts'] ), 0, self::MAX_POSTS );
		$p['highlights'] = array_slice( array_values( $p['highlights'] ), 0, self::MAX_HIGHLIGHTS );
		return $p;
	}

	/** Kopiuje zdjęcia na nasz serwer (linki z Instagrama wygasają, a canvas wymaga tej samej domeny). */
	private static function localize( array $p ) {
		$p['avatar'] = IW_Storage::localize_image( $p['avatar'], $p['username'] );
		foreach ( $p['posts'] as &$post ) {
			$post['image'] = IW_Storage::localize_image( $post['image'], $p['username'] );
		}
		foreach ( $p['highlights'] as &$h ) {
			$h['image'] = IW_Storage::localize_image( $h['image'], $p['username'] );
		}
		return $p;
	}

	private static function http_json( $url, $headers = array() ) {
		$res = wp_remote_get( $url, array( 'timeout' => 20, 'headers' => $headers ) );
		if ( is_wp_error( $res ) ) {
			return new WP_Error( 'iw_http', 'Nie udało się połączyć ze źródłem danych.' );
		}
		$code = wp_remote_retrieve_response_code( $res );
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( 404 === $code ) {
			return new WP_Error( 'iw_not_found', 'Nie znaleziono takiego profilu.' );
		}
		if ( $code >= 400 || null === $data ) {
			return new WP_Error( 'iw_http', 'Źródło danych zwróciło błąd (' . (int) $code . ').', array( 'body' => $data ) );
		}
		return $data;
	}

	// ---------------------------------------------------------------------------------
	// HikerAPI – https://hikerapi.com (płatne, każdy publiczny profil).
	// UWAGA: ścieżki i pola do potwierdzenia z aktualną dokumentacją HikerAPI przy podpinaniu klucza.
	// ---------------------------------------------------------------------------------
	private static function from_hikerapi( $username ) {
		$key = IW_Settings::get( 'hiker_key' );
		if ( ! $key ) {
			return new WP_Error( 'iw_config', 'Brak klucza HikerAPI.' );
		}
		$base    = 'https://api.hikerapi.com';
		$headers = array( 'x-access-key' => $key, 'accept' => 'application/json' );

		$data = self::http_json( $base . '/v2/user/by/username?' . http_build_query( array( 'username' => $username ) ), $headers );
		if ( is_wp_error( $data ) ) {
			return $data;
		}
		$u = isset( $data['user'] ) ? $data['user'] : $data;
		if ( empty( $u['username'] ) ) {
			return new WP_Error( 'iw_not_found', 'Nie znaleziono takiego profilu.' );
		}

		$avatar = $u['hd_profile_pic_url_info']['url'] ?? $u['profile_pic_url_hd'] ?? $u['profile_pic_url'] ?? null;
		$id     = $u['pk'] ?? $u['id'] ?? null;

		$profile = array(
			'username'    => $u['username'],
			'full_name'   => $u['full_name'] ?? '',
			'category'    => $u['category'] ?? $u['category_name'] ?? '',
			'biography'   => $u['biography'] ?? '',
			'website'     => $u['external_url'] ?? '',
			'avatar'      => $avatar,
			'is_verified' => ! empty( $u['is_verified'] ),
			'is_private'  => ! empty( $u['is_private'] ),
			'counts'      => array(
				'posts'     => (int) ( $u['media_count'] ?? 0 ),
				'followers' => (int) ( $u['follower_count'] ?? 0 ),
				'following' => (int) ( $u['following_count'] ?? 0 ),
			),
			'highlights'  => array(),
			'posts'       => array(),
			'source'      => 'hikerapi',
		);

		if ( $profile['is_private'] || ! $id ) {
			return $profile; // Nagłówek jest, siatkę klient uzupełni ręcznie.
		}

		$medias = self::http_json( $base . '/v1/user/medias/chunk?' . http_build_query( array( 'user_id' => $id ) ), $headers );
		if ( ! is_wp_error( $medias ) ) {
			$items = isset( $medias['items'] ) ? $medias['items'] : ( isset( $medias[0] ) && is_array( $medias[0] ) && isset( $medias[0][0] ) ? $medias[0] : $medias );
			foreach ( (array) $items as $m ) {
				if ( ! is_array( $m ) ) {
					continue;
				}
				$img = $m['thumbnail_url'] ?? $m['image_versions2']['candidates'][0]['url'] ?? $m['resources'][0]['thumbnail_url'] ?? $m['carousel_media'][0]['image_versions2']['candidates'][0]['url'] ?? null;
				$type = 'photo';
				if ( 8 === (int) ( $m['media_type'] ?? 0 ) ) {
					$type = 'carousel';
				} elseif ( 2 === (int) ( $m['media_type'] ?? 0 ) ) {
					$type = 'clips' === ( $m['product_type'] ?? '' ) ? 'reel' : 'video';
				}
				$profile['posts'][] = array( 'image' => $img, 'type' => $type );
			}
		}

		$hl = self::http_json( $base . '/v1/user/highlights?' . http_build_query( array( 'user_id' => $id ) ), $headers );
		if ( ! is_wp_error( $hl ) ) {
			foreach ( (array) ( $hl['items'] ?? $hl ) as $h ) {
				if ( ! is_array( $h ) ) {
					continue;
				}
				$profile['highlights'][] = array(
					'title' => $h['title'] ?? '',
					'image' => $h['cover_media']['cropped_image_version']['url'] ?? $h['cover_media']['thumbnail_url'] ?? null,
				);
			}
		}

		return $profile;
	}

	// ---------------------------------------------------------------------------------
	// Meta Business Discovery (darmowe, tylko konta firmowe i twórców).
	// ---------------------------------------------------------------------------------
	private static function from_business_discovery( $username ) {
		$ig_id = IW_Settings::get( 'bd_ig_user_id' );
		$token = IW_Settings::get( 'bd_token' );
		if ( ! $ig_id || ! $token ) {
			return new WP_Error( 'iw_config', 'Brak konfiguracji Business Discovery.' );
		}
		$fields = sprintf(
			'business_discovery.username(%s){username,name,biography,website,profile_picture_url,followers_count,follows_count,media_count,media.limit(%d){media_type,media_url,thumbnail_url}}',
			$username,
			self::MAX_POSTS
		);
		$url  = 'https://graph.facebook.com/v23.0/' . rawurlencode( $ig_id ) . '?' . http_build_query( array( 'fields' => $fields, 'access_token' => $token ) );
		$data = self::http_json( $url );
		if ( is_wp_error( $data ) ) {
			$body = $data->get_error_data()['body'] ?? null;
			if ( isset( $body['error'] ) ) {
				return new WP_Error( 'iw_private', 'Profil nie jest kontem firmowym ani kontem twórcy albo nie istnieje.' );
			}
			return $data;
		}
		$b = $data['business_discovery'] ?? null;
		if ( ! $b ) {
			return new WP_Error( 'iw_not_found', 'Nie znaleziono takiego profilu.' );
		}
		$posts = array();
		foreach ( (array) ( $b['media']['data'] ?? array() ) as $m ) {
			$type    = strtolower( $m['media_type'] ?? 'image' );
			$posts[] = array(
				'image' => 'video' === $type ? ( $m['thumbnail_url'] ?? null ) : ( $m['media_url'] ?? null ),
				'type'  => 'video' === $type ? 'reel' : ( 'carousel_album' === $type ? 'carousel' : 'photo' ),
			);
		}
		return array(
			'username'    => $b['username'],
			'full_name'   => $b['name'] ?? '',
			'category'    => '',
			'biography'   => $b['biography'] ?? '',
			'website'     => $b['website'] ?? '',
			'avatar'      => $b['profile_picture_url'] ?? null,
			'is_verified' => false,
			'is_private'  => false,
			'counts'      => array(
				'posts'     => (int) ( $b['media_count'] ?? 0 ),
				'followers' => (int) ( $b['followers_count'] ?? 0 ),
				'following' => (int) ( $b['follows_count'] ?? 0 ),
			),
			'highlights'  => array(),
			'posts'       => $posts,
			'source'      => 'business_discovery',
		);
	}

	// ---------------------------------------------------------------------------------
	// Demo – dane przykładowe bez API (do testów konfiguratora i pliku do druku).
	// ---------------------------------------------------------------------------------
	private static function from_demo( $username ) {
		$seed = crc32( $username );
		$name = ucwords( str_replace( array( '_', '.' ), ' ', $username ) );
		$h    = array( 'Opinie', 'Oferta', 'O mnie', 'Kursy', 'Kontakt' );
		return array(
			'username'    => $username,
			'full_name'   => $name,
			'category'    => 'Przedsiębiorca',
			'biography'   => "Holistyczne podejście do zdrowia i życia ✨\nZdrowy styl życia 🌿 TOP lider networkmarketingu\nŻycie w zgodzie z moim wewnętrznym JA",
			'website'     => '',
			'avatar'      => null,
			'is_verified' => false,
			'is_private'  => false,
			'counts'      => array(
				'posts'     => 100 + $seed % 900,
				'followers' => 1000 + $seed % 20000,
				'following' => 100 + $seed % 800,
			),
			'highlights'  => array_map( fn( $t ) => array( 'title' => $t, 'image' => null ), $h ),
			'posts'       => array_fill( 0, 9, array( 'image' => null, 'type' => 'photo' ) ),
			'source'      => 'demo',
		);
	}
}
