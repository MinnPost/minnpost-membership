<?php
/**
 * The template for displaying support pages
 *
 */
get_header(); ?>
<?php
global $minnpost_membership;
$url_params = $minnpost_membership->front_end->process_parameters( 'get' );
?>

	<div id="primary" class="m-layout-membership o-support">
		<main id="main" class="site-main" role="main">
			<?php if ( ! isset( $url_params['campaign'] ) || '' === get_option( $minnpost_membership->option_prefix . 'support_title_' . $url_params['campaign'], '' ) ) : ?>
				<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_title', '' ) ) : ?>
					<header class="m-membership-intro">
						<h1 class="a-standalone-title"><?php echo get_option( $minnpost_membership->option_prefix . 'support_title', '' ); ?></h1>
					</header>
				<?php endif; ?>
			<?php else : ?>
				<header class="m-membership-intro m-membership-intro-campaign-<?php echo $url_params['campaign']; ?>">
					<h1 class="a-standalone-title"><?php echo get_option( $minnpost_membership->option_prefix . 'support_title_' . $url_params['campaign'], '' ); ?></h1>
				</header>
			<?php endif; ?>
			<div class="m-entry-content">
				<form action="<?php echo admin_url( 'admin-ajax.php' ); ?>" method="post" class="m-form m-form-membership m-form-membership-support">
					<input type="hidden" name="action" value="membership_form_submit">
					<input type="hidden" name="minnpost_membership_form_nonce" value="<?php echo wp_create_nonce( 'mem-form-nonce' ); ?>">
					<input type="hidden" name="current_url" value="<?php echo rtrim( parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ), '/' ); ?>">
					<?php if ( ! empty( $url_params ) ) : ?>
						<?php foreach ( $url_params as $key => $value ) : ?>
							<input type="hidden" name="<?php echo $key; ?>" value="<?php echo $value; ?>">
						<?php endforeach; ?>
					<?php endif; ?>

					<?php if ( ! isset( $url_params['campaign'] ) || '' === get_option( $minnpost_membership->option_prefix . 'support_summary_' . $url_params['campaign'], '' ) ) : ?>
						<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_summary', '' ) ) : ?>
							<section class="m-membership-summary">
								<?php echo wpautop( get_option( $minnpost_membership->option_prefix . 'support_summary', '' ) ); ?>
							</section>
						<?php endif; ?>
					<?php else : ?>
						<section class="m-membership-summary-campaign-<?php echo $url_params['campaign']; ?>">
							<?php echo wpautop( get_option( $minnpost_membership->option_prefix . 'support_summary_' . $url_params['campaign'], '' ) ); ?>
						</section>
					<?php endif; ?>

					<?php if ( ! empty( $_GET['errors'] ) ) : ?>
						<div class="m-form-message m-form-message-error">
							<p><?php echo $minnpost_membership->front_end->get_error_message( $_GET['errors'] ); ?></p>
						</div>
					<?php endif; ?>

					put the i would like to give here
					then the field
					then the radios

					then the membership indicator

					then the give button
					then the learn about benefits (make sure it gets all the query values)

					then the heading
					then the reasons

					<?php
					if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_post_body_text_link', '' ) ) {

						$text          = get_option( $minnpost_membership->option_prefix . 'support_post_body_text_link', '' );
						$link          = get_option( $minnpost_membership->option_prefix . 'support_post_body_link_url', '' );
						$link_text     = get_option( $minnpost_membership->option_prefix . 'support_post_body_link_text', '' );
						$link_fragment = ltrim( get_option( $minnpost_membership->option_prefix . 'support_post_body_link_fragment', '' ), '#' );
						$link_class    = get_option( $minnpost_membership->option_prefix . 'support_post_body_link_class', '' );
						$link_text     = get_option( $minnpost_membership->option_prefix . 'support_post_body_link_text', '' );

						if ( '' !== $link && '' !== $link_text ) {
							if ( '' !== $link_fragment ) {
								$link .= '#' . $link_fragment;
							}
							if ( '' !== $link_class ) {
								$class = ' class="' . $link_class . '"';
							} else {
								$class = '';
							}

							// preserve valid form parameters
							foreach ( $url_params as $key => $value ) {
								if ( false !== $value ) {
									$link = add_query_arg( $key, $value, $link );
								}
							}

							$link = '<a href="' . esc_url( $link ) . '"' . $class . '>' . $link_text . '</a>';
						}

						echo sprintf( '<h3 class="a-finish-strong">%1$s</h3>',
							str_replace( $link_text, $link, $text )
						);
					}
					?>

					<?php
					if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_post_body_show_member_details_link' ) ) {
						echo sprintf( '<p class="member-benefit-details-link">%1$s</p>',
							get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_link_from_other_pages' )
						);
					}
					?>

				</form>
			</div>
		</main><!-- #main -->

	</div><!-- #primary -->

<?php
get_footer();
