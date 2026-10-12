<?php
/**
 * Strona w panelu: Narzędzia → Zdalny Edytor.
 */

defined( 'ABSPATH' ) || exit;

class ZE_Admin {

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_post_ze_toggle', array( __CLASS__, 'handle_toggle' ) );
		add_action( 'admin_post_ze_restore', array( __CLASS__, 'handle_restore' ) );
	}

	public static function menu() {
		add_management_page( 'Zdalny Edytor', 'Zdalny Edytor', 'manage_options', 'zdalny-edytor', array( __CLASS__, 'render' ) );
	}

	public static function handle_toggle() {
		check_admin_referer( 'ze_toggle' );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Brak uprawnień.' );
		}
		update_option( 'ze_enabled', get_option( 'ze_enabled', 1 ) ? 0 : 1 );
		wp_safe_redirect( admin_url( 'tools.php?page=zdalny-edytor' ) );
		exit;
	}

	public static function handle_restore() {
		$id = isset( $_POST['snapshot'] ) ? (int) $_POST['snapshot'] : 0;
		check_admin_referer( 'ze_restore_' . $id );
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( 'Brak uprawnień.' );
		}
		$result = ZE_Snapshots::restore( $id );
		$msg    = is_wp_error( $result ) ? 'error' : 'restored';
		wp_safe_redirect( admin_url( 'tools.php?page=zdalny-edytor&ze_msg=' . $msg ) );
		exit;
	}

	public static function render() {
		$enabled   = (bool) get_option( 'ze_enabled', 1 );
		$snapshots = ZE_Snapshots::query( array( 'per_page' => 30 ) );
		$api_url   = rest_url( ZE_NAMESPACE . '/' );
		$app_pw    = wp_is_application_passwords_available();
		$msg       = isset( $_GET['ze_msg'] ) ? sanitize_key( $_GET['ze_msg'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
		?>
		<div class="wrap">
			<h1>Zdalny Edytor Strony</h1>

			<?php if ( 'restored' === $msg ) : ?>
				<div class="notice notice-success"><p>Przywrócono migawkę. Stan sprzed przywrócenia też zapisano jako migawkę.</p></div>
			<?php elseif ( 'error' === $msg ) : ?>
				<div class="notice notice-error"><p>Nie udało się przywrócić migawki.</p></div>
			<?php endif; ?>

			<h2>Status</h2>
			<table class="form-table" role="presentation">
				<tr>
					<th>API</th>
					<td>
						<strong><?php echo $enabled ? 'włączone' : 'wyłączone'; ?></strong>
						<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="display:inline;margin-left:1em">
							<?php wp_nonce_field( 'ze_toggle' ); ?>
							<input type="hidden" name="action" value="ze_toggle">
							<button class="button"><?php echo $enabled ? 'Wyłącz' : 'Włącz'; ?></button>
						</form>
					</td>
				</tr>
				<tr><th>Adres API</th><td><code><?php echo esc_html( $api_url ); ?></code></td></tr>
				<tr>
					<th>Hasła aplikacji</th>
					<td>
						<?php if ( $app_pw ) : ?>
							Dostępne. Utwórz hasło w <a href="<?php echo esc_url( admin_url( 'profile.php#application-passwords-section' ) ); ?>">swoim profilu</a> (np. nazwa „Zdalny Edytor”) i wpisz je w konfiguracji klienta.
						<?php else : ?>
							<span style="color:#b32d2e">Niedostępne. Hasła aplikacji wymagają HTTPS albo są wyłączone przez inną wtyczkę/hosting.</span>
						<?php endif; ?>
					</td>
				</tr>
			</table>

			<h2>Ostatnie zmiany (migawki)</h2>
			<p>Przed każdą zmianą przez API zapisywany jest poprzedni stan. Przechowywanych jest <?php echo (int) ZE_Snapshots::MAX_KEEP; ?> ostatnich migawek.</p>
			<table class="widefat striped">
				<thead><tr><th>ID</th><th>Data</th><th>Typ</th><th>Obiekt</th><th>Opis</th><th></th></tr></thead>
				<tbody>
				<?php if ( ! $snapshots ) : ?>
					<tr><td colspan="6">Brak migawek.</td></tr>
				<?php endif; ?>
				<?php foreach ( $snapshots as $snap ) : ?>
					<tr>
						<td><?php echo (int) $snap['id']; ?></td>
						<td><?php echo esc_html( $snap['date'] ); ?></td>
						<td><?php echo esc_html( $snap['type'] ); ?></td>
						<td>
							<?php
							if ( 'post' === $snap['type'] && get_post( (int) $snap['object'] ) ) {
								printf( '<a href="%s">%s</a>', esc_url( get_edit_post_link( (int) $snap['object'] ) ), esc_html( get_the_title( (int) $snap['object'] ) ?: '#' . $snap['object'] ) );
							} else {
								echo esc_html( $snap['object'] );
							}
							?>
						</td>
						<td><?php echo esc_html( $snap['reason'] ); ?></td>
						<td>
							<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" onsubmit="return confirm('Przywrócić ten stan?');">
								<?php wp_nonce_field( 'ze_restore_' . $snap['id'] ); ?>
								<input type="hidden" name="action" value="ze_restore">
								<input type="hidden" name="snapshot" value="<?php echo (int) $snap['id']; ?>">
								<button class="button button-small">Przywróć</button>
							</form>
						</td>
					</tr>
				<?php endforeach; ?>
				</tbody>
			</table>
		</div>
		<?php
	}
}
