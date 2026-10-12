<?php
/**
 * Operacje na drzewie bloków Gutenberga.
 *
 * Blok wskazujemy ścieżką indeksów, np. "2" (trzeci blok na stronie) albo
 * "2.0.1" (drugi blok wewnątrz pierwszego bloku wewnątrz trzeciego bloku).
 */

defined( 'ABSPATH' ) || exit;

class ZE_Blocks {

	/**
	 * Parsuje treść i usuwa puste bloki "freeform" (same odstępy między blokami).
	 */
	public static function parse( $content ) {
		$blocks = parse_blocks( $content );
		return array_values(
			array_filter(
				$blocks,
				function ( $block ) {
					return ! ( null === $block['blockName'] && '' === trim( $block['innerHTML'] ) );
				}
			)
		);
	}

	public static function serialize( $blocks ) {
		return implode( "\n\n", array_map( 'serialize_block', $blocks ) );
	}

	/**
	 * Uproszczony widok drzewa bloków dla klienta API.
	 */
	public static function outline( $blocks, $prefix = '', $with_html = true ) {
		$out = array();
		foreach ( $blocks as $i => $block ) {
			$path = '' === $prefix ? (string) $i : $prefix . '.' . $i;
			$item = array(
				'path'  => $path,
				'name'  => $block['blockName'] ?? 'core/freeform',
				'attrs' => (object) $block['attrs'],
				'text'  => self::text_preview( $block ),
			);
			if ( $with_html && empty( $block['innerBlocks'] ) ) {
				$item['html'] = $block['innerHTML'];
			}
			if ( ! empty( $block['innerBlocks'] ) ) {
				$item['inner'] = self::outline( $block['innerBlocks'], $path, $with_html );
			}
			$out[] = $item;
		}
		return $out;
	}

	private static function text_preview( $block ) {
		$text = trim( preg_replace( '/\s+/u', ' ', wp_strip_all_tags( $block['innerHTML'] ) ) );
		return mb_strlen( $text ) > 160 ? mb_substr( $text, 0, 157 ) . '...' : $text;
	}

	private static function parse_path( $path ) {
		$path = trim( (string) $path );
		if ( '' === $path ) {
			return array();
		}
		if ( ! preg_match( '/^\d+(\.\d+)*$/', $path ) ) {
			return new WP_Error( 'ze_bad_path', 'Nieprawidłowa ścieżka bloku: ' . $path, array( 'status' => 400 ) );
		}
		return array_map( 'intval', explode( '.', $path ) );
	}

	/**
	 * Zwraca referencję do bloku pod ścieżką albo WP_Error.
	 */
	private static function &node( array &$blocks, array $indexes ) {
		$list = &$blocks;
		$node = null;
		foreach ( $indexes as $depth => $i ) {
			if ( ! isset( $list[ $i ] ) ) {
				$error = new WP_Error( 'ze_bad_path', 'Nie ma bloku pod ścieżką ' . implode( '.', array_slice( $indexes, 0, $depth + 1 ) ), array( 'status' => 400 ) );
				return $error;
			}
			$node = &$list[ $i ];
			$list = &$node['innerBlocks'];
		}
		return $node;
	}

	/**
	 * Po zmianie liczby bloków wewnętrznych odbudowuje innerContent rodzica,
	 * zachowując otaczający HTML (np. <div class="wp-block-group">...</div>).
	 */
	private static function rebuild_inner_content( array &$parent ) {
		$chunks      = $parent['innerContent'];
		$null_pos    = array_keys( $chunks, null, true );
		$count_inner = count( $parent['innerBlocks'] );

		if ( $null_pos ) {
			$first  = $null_pos[0];
			$last   = end( $null_pos );
			$prefix = implode( '', array_slice( $chunks, 0, $first ) );
			$suffix = implode( '', array_slice( $chunks, $last + 1 ) );
			$sep    = "\n\n";
			if ( count( $null_pos ) > 1 ) {
				$sep = implode( '', array_slice( $chunks, $null_pos[0] + 1, $null_pos[1] - $null_pos[0] - 1 ) );
			}
		} else {
			// Pusty kontener: wstawiamy bloki przed ostatnim znacznikiem zamykającym.
			$html = implode( '', $chunks );
			$pos  = strrpos( $html, '</' );
			if ( false === $pos ) {
				$pos = strlen( $html );
			}
			$prefix = substr( $html, 0, $pos );
			$suffix = substr( $html, $pos );
			$sep    = "\n\n";
		}

		$content = array( $prefix );
		for ( $i = 0; $i < $count_inner; $i++ ) {
			if ( $i > 0 ) {
				$content[] = $sep;
			}
			$content[] = null;
		}
		$content[]              = $suffix;
		$parent['innerContent'] = $content;
		$parent['innerHTML']    = $prefix . ( $count_inner > 1 ? str_repeat( $sep, $count_inner - 1 ) : '' ) . $suffix;
	}

	private static function markup_to_blocks( $markup ) {
		$blocks = self::parse( (string) $markup );
		if ( ! $blocks ) {
			return new WP_Error( 'ze_empty_markup', 'Podany kod bloków jest pusty.', array( 'status' => 400 ) );
		}
		return $blocks;
	}

	private static function replace_text_recursive( array &$block, $find, $replace, &$count ) {
		$n                  = 0;
		$block['innerHTML'] = str_replace( $find, $replace, $block['innerHTML'], $n );
		$count             += $n;
		foreach ( $block['innerContent'] as &$chunk ) {
			if ( is_string( $chunk ) ) {
				$chunk = str_replace( $find, $replace, $chunk );
			}
		}
		unset( $chunk );
		array_walk_recursive(
			$block['attrs'],
			function ( &$value ) use ( $find, $replace, &$count ) {
				if ( is_string( $value ) ) {
					$n      = 0;
					$value  = str_replace( $find, $replace, $value, $n );
					$count += $n;
				}
			}
		);
		foreach ( $block['innerBlocks'] as &$inner ) {
			self::replace_text_recursive( $inner, $find, $replace, $count );
		}
		unset( $inner );
	}

	/**
	 * Wykonuje listę operacji po kolei. Każda kolejna operacja widzi efekt poprzednich.
	 *
	 * Operacje:
	 *  - update_attrs: { path, attrs, replace? }  scala atrybuty (null usuwa klucz)
	 *  - set_html:     { path, html }             podmienia HTML bloku bez bloków wewnętrznych
	 *  - replace:      { path, markup }           zastępuje blok jednym lub wieloma blokami
	 *  - insert:       { path?, position, markup } position: before|after|start|end
	 *  - remove:       { path }
	 *  - move:         { path, to, position }     "to" liczone po usunięciu bloku ze starego miejsca
	 *  - replace_text: { path?, find, replace }   w HTML i atrybutach tekstowych (całe poddrzewo)
	 *
	 * @return array|WP_Error Nowa lista bloków i raport.
	 */
	public static function apply_ops( array $blocks, array $ops ) {
		$report = array();
		foreach ( $ops as $n => $op ) {
			$result = self::apply_op( $blocks, (array) $op );
			if ( is_wp_error( $result ) ) {
				$result->add_data( array( 'status' => 400, 'operation' => $n ) );
				return new WP_Error( $result->get_error_code(), sprintf( 'Operacja #%d (%s): %s', $n, $op['op'] ?? '?', $result->get_error_message() ), array( 'status' => 400, 'operation' => $n ) );
			}
			$report[] = $result;
		}
		return array(
			'blocks' => $blocks,
			'report' => $report,
		);
	}

	/**
	 * Wywołuje $fn na liście rodzeństwa (lista główna albo innerBlocks rodzica),
	 * a potem odbudowuje innerContent rodzica.
	 */
	private static function with_siblings( array &$blocks, array $parent_indexes, callable $fn ) {
		if ( ! $parent_indexes ) {
			return $fn( $blocks );
		}
		$parent = &self::node( $blocks, $parent_indexes );
		if ( is_wp_error( $parent ) ) {
			return $parent;
		}
		$result = $fn( $parent['innerBlocks'] );
		if ( ! is_wp_error( $result ) ) {
			self::rebuild_inner_content( $parent );
		}
		return $result;
	}

	private static function apply_op( array &$blocks, array $op ) {
		$type    = $op['op'] ?? '';
		$indexes = self::parse_path( $op['path'] ?? '' );
		if ( is_wp_error( $indexes ) ) {
			return $indexes;
		}
		$path = implode( '.', $indexes );

		if ( 'insert' === $type ) {
			$new = self::markup_to_blocks( $op['markup'] ?? '' );
			if ( is_wp_error( $new ) ) {
				return $new;
			}
			$position = $op['position'] ?? ( $indexes ? 'after' : 'end' );
			$result   = self::insert_blocks( $blocks, $indexes, $position, $new );
			if ( is_wp_error( $result ) ) {
				return $result;
			}
			return array( 'op' => $type, 'path' => $path, 'position' => $position, 'inserted' => count( $new ) );
		}

		if ( 'replace_text' === $type ) {
			if ( ! isset( $op['find'] ) || '' === (string) $op['find'] ) {
				return new WP_Error( 'ze_bad_op', 'Brak pola "find".' );
			}
			$find    = (string) $op['find'];
			$replace = (string) ( $op['replace'] ?? '' );
			$count   = 0;
			if ( $indexes ) {
				$node = &self::node( $blocks, $indexes );
				if ( is_wp_error( $node ) ) {
					return $node;
				}
				self::replace_text_recursive( $node, $find, $replace, $count );
			} else {
				foreach ( $blocks as &$block ) {
					self::replace_text_recursive( $block, $find, $replace, $count );
				}
				unset( $block );
			}
			return array( 'op' => $type, 'path' => $path, 'replaced' => $count );
		}

		if ( ! $indexes ) {
			return new WP_Error( 'ze_bad_op', 'Operacja "' . $type . '" wymaga ścieżki bloku.' );
		}

		$node = &self::node( $blocks, $indexes );
		if ( is_wp_error( $node ) ) {
			return $node;
		}

		$parent_indexes = array_slice( $indexes, 0, -1 );
		$index          = end( $indexes );

		switch ( $type ) {
			case 'update_attrs':
				$base = empty( $op['replace'] ) ? $node['attrs'] : array();
				foreach ( (array) ( $op['attrs'] ?? array() ) as $key => $value ) {
					if ( null === $value ) {
						unset( $base[ $key ] );
					} else {
						$base[ $key ] = $value;
					}
				}
				$node['attrs'] = $base;
				return array( 'op' => $type, 'path' => $path );

			case 'set_html':
				if ( ! empty( $node['innerBlocks'] ) ) {
					return new WP_Error( 'ze_bad_op', 'Blok ' . $path . ' ma bloki wewnętrzne. Użyj "replace" albo edytuj bloki wewnętrzne.' );
				}
				$html = trim( (string) ( $op['html'] ?? '' ) );
				// Zachowujemy odstępy wokół HTML jak w oryginale (tak zapisuje edytor).
				if ( preg_match( '/^\s+/', $node['innerHTML'], $m ) ) {
					$html = $m[0] . $html;
				}
				if ( preg_match( '/\s+$/', $node['innerHTML'], $m ) ) {
					$html .= $m[0];
				}
				$node['innerHTML']    = $html;
				$node['innerContent'] = array( $html );
				return array( 'op' => $type, 'path' => $path );

			case 'replace':
				unset( $node );
				$new = self::markup_to_blocks( $op['markup'] ?? '' );
				if ( is_wp_error( $new ) ) {
					return $new;
				}
				self::with_siblings(
					$blocks,
					$parent_indexes,
					function ( array &$list ) use ( $index, $new ) {
						array_splice( $list, $index, 1, $new );
					}
				);
				return array( 'op' => $type, 'path' => $path, 'inserted' => count( $new ) );

			case 'remove':
				unset( $node );
				self::with_siblings(
					$blocks,
					$parent_indexes,
					function ( array &$list ) use ( $index ) {
						array_splice( $list, $index, 1 );
					}
				);
				return array( 'op' => $type, 'path' => $path );

			case 'move':
				$moved = $node;
				unset( $node );
				$to = self::parse_path( $op['to'] ?? '' );
				if ( is_wp_error( $to ) ) {
					return $to;
				}
				self::with_siblings(
					$blocks,
					$parent_indexes,
					function ( array &$list ) use ( $index ) {
						array_splice( $list, $index, 1 );
					}
				);
				$result = self::insert_blocks( $blocks, $to, $op['position'] ?? 'before', array( $moved ) );
				if ( is_wp_error( $result ) ) {
					return $result;
				}
				return array( 'op' => $type, 'from' => $path, 'to' => implode( '.', $to ) );
		}

		return new WP_Error( 'ze_bad_op', 'Nieznana operacja: "' . $type . '". Dozwolone: update_attrs, set_html, replace, insert, remove, move, replace_text.' );
	}

	/**
	 * position: before|after – obok wskazanego bloku; start|end – wewnątrz wskazanego bloku
	 * (bez ścieżki: na początku / końcu strony).
	 */
	private static function insert_blocks( array &$blocks, array $indexes, $position, array $new ) {
		if ( ! in_array( $position, array( 'before', 'after', 'start', 'end' ), true ) ) {
			return new WP_Error( 'ze_bad_op', 'position musi być jednym z: before, after, start, end.' );
		}

		if ( ! $indexes ) {
			$at = in_array( $position, array( 'start', 'before' ), true ) ? 0 : count( $blocks );
			array_splice( $blocks, $at, 0, $new );
			return true;
		}

		$target = &self::node( $blocks, $indexes );
		if ( is_wp_error( $target ) ) {
			return $target;
		}

		if ( 'start' === $position || 'end' === $position ) {
			$at = 'start' === $position ? 0 : count( $target['innerBlocks'] );
			array_splice( $target['innerBlocks'], $at, 0, $new );
			self::rebuild_inner_content( $target );
			return true;
		}
		unset( $target );

		$index = end( $indexes );
		$at    = 'before' === $position ? $index : $index + 1;
		return self::with_siblings(
			$blocks,
			array_slice( $indexes, 0, -1 ),
			function ( array &$list ) use ( $at, $new ) {
				array_splice( $list, $at, 0, $new );
				return true;
			}
		);
	}
}
