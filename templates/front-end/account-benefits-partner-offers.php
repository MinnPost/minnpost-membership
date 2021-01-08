<?php
/**
 * The template for displaying the partner offer claim page
 *
 */
get_header(); ?>
<?php
$minnpost_membership = minnpost_membership();
$user_state          = $minnpost_membership->user_info->get_user_access( '', 'support-partner-offers' )['state'];
$benefit_nonce       = wp_create_nonce( 'mem-form-nonce' );
$offers              = $minnpost_membership->content_items->get_partner_offers();
$user_claim          = isset( $minnpost_membership->content_items->get_user_offer_claims()[0] ) ? $minnpost_membership->content_items->get_user_offer_claims()[0] : array();

$check_value = true;
$open_offers = array_filter(
	$offers,
	function ( $offer ) use ( $check_value ) {
		return filter_var( $offer->claimable, FILTER_VALIDATE_BOOLEAN ) === $check_value;
	}
);
?>
	<div id="primary" class="m-layout-membership o-partner-offers m-page">
		<main id="main" class="site-main" role="main">
			<header class="m-entry-header m-entry-header-singular">
				<h1 class="a-entry-title"><?php echo get_option( $minnpost_membership->option_prefix . 'account-benefits-partner-offers_title', '' ); ?></h1>
				<?php if ( 0 === count( $open_offers ) ) : ?>
					<p class="a-intro">Our next round of partner offers becomes available at <strong><?php echo date_i18n( get_option( 'time_format' ), $offers[0]->claimable_start_date ); ?> on <?php echo date_i18n( get_option( 'date_format' ), $offers[0]->claimable_start_date ); ?></strong>. Right now the minnpost.com time is <strong><?php echo date_i18n( get_option( 'time_format' ), current_time( 'timestamp' ) ); ?> on <?php echo date_i18n( get_option( 'date_format' ), current_time( 'timestamp' ) ); ?></strong>. You can <a href="#" class="a-refresh-page">refresh this page</a> anytime.</p>
				<?php endif; ?>
			</header>
			<section class="m-entry-content m-partner-offers">
				<?php if ( $offers ) : ?>
					<form action="<?php echo admin_url( 'admin-ajax.php' ); ?>" method="post" class="m-form m-form-membership m-form-membership-benefit m-form-membership-partner-offers">
						<input type="hidden" name="action" value="benefit_form_submit">
						<input type="hidden" name="minnpost_membership_benefit_form_nonce" value="<?php echo $benefit_nonce; ?>">
						<input type="hidden" name="current_url" value="<?php echo rtrim( parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ), '/' ); ?>">
						<input type="hidden" name="benefit-name" value="partner-offers">
						<fieldset>
							<?php global $post; ?>
							<?php foreach ( $offers as $post ) : ?>
								<article id="partner-offer-<?php the_ID(); ?>" <?php post_class( 'm-partner-offer' ); ?>>
									<?php setup_postdata( $post ); ?>
									<?php $minnpost_membership->content_items->partner_offer_image( $post->post_parent, true ); ?>
									<div class="m-partner-offer-content">
										<header class="m-entry-header m-partner-offer-header">
											<?php the_title( '<h1 class="a-entry-title">', '</h1>' ); ?>
											<?php if ( null !== $post->quantity && null !== $post->offer_type ) : ?>
												<h2 class="a-offer"><?php echo $post->quantity . ' ' . $post->offer_type; ?></h2>
											<?php endif; ?>
										</header>
										<?php if ( null !== $post->restriction ) : ?>
											<p><?php echo $post->restriction; ?></p>
										<?php endif; ?>

										<?php if ( null !== $post->instances ) : ?>

											<?php $offer_status_content = $minnpost_membership->front_end->get_partner_offer_status_content( $post, $post->instances, $user_claim ); ?>

											<?php if ( 0 < $post->unclaimed_instance_count ) : ?>
												<?php $key = 0; ?>

												<?php foreach ( $post->instances as $key => $instance ) : ?>
													<?php if ( ! isset( $instance['_mp_partner_offer_claimed_date'] ) || '' === $instance['_mp_partner_offer_claimed_date'] ) : ?>
														<?php break; ?>
													<?php endif; ?>
												<?php endforeach; ?>

												<?php if ( 0 === $post->dated_instance_count ) : ?>
													<input type="hidden" name="instance-id-<?php the_ID(); ?>" value="<?php echo $key; ?>">
												<?php endif; ?>

											<?php endif; ?>
											<div class="m-benefit-claim">
												<?php
												$message_class = ' ' . $offer_status_content['message_class'];
												$message       = $offer_status_content['message'];
												if ( '' !== $message ) {
													$message_class = ' m-benefit-message-visible' . $message_class;
												}
												if ( '' !== $offer_status_content['button_class'] ) {
													$button_class = ' ' . $offer_status_content['button_class'];
												} else {
													$button_class = '';
												}
												if ( '' !== $offer_status_content['button_attr'] ) {
													$button_attr = ' ' . $offer_status_content['button_attr'];
												} else {
													$button_attr = '';
												}
												?>
												<div class="m-benefit-message<?php echo $message_class; ?>">
													<?php if ( '' !== $message ) : ?>
														<?php echo $message; ?>
													<?php endif; ?>
												</div>

												<?php if ( 0 < $post->unclaimed_instance_count && 0 < $post->dated_instance_count ) : ?>
													<select id="instance-id-<?php the_ID(); ?>" name="instance-id-<?php the_ID(); ?>">
														<option value="">Select an option</option>
														<?php foreach ( $post->instances as $key => $instance ) : ?>
															<?php if ( ! isset( $instance['_mp_partner_offer_claimed_date'] ) || '' === $instance['_mp_partner_offer_claimed_date'] ) : ?>
																<option value="<?php echo $key; ?>"><?php echo date_i18n( get_option( 'date_format' ), $instance['_mp_partner_offer_instance_date'] ); ?> @ <?php echo date_i18n( get_option( 'time_format' ), $instance['_mp_partner_offer_instance_date'] ); ?></option>
															<?php endif; ?>
														<?php endforeach; ?>
													</select>
												<?php endif; ?>

												<?php if ( wp_login_url( $_SERVER['REQUEST_URI'] ) !== $offer_status_content['button_value'] && '' !== $offer_status_content['button_label'] ) : ?>
													<button type="submit" data-benefit-nonce="<?php echo $benefit_nonce; ?>" value="<?php echo $offer_status_content['button_value']; ?>" name="post_id" class="a-button a-benefit-button<?php echo $button_class; ?>"<?php echo $button_attr; ?>><?php echo $offer_status_content['button_label']; ?></button>
												<?php elseif ( wp_login_url( $_SERVER['REQUEST_URI'] ) === $offer_status_content['button_value'] && '' !== $offer_status_content['button_label'] ) : ?>
													<a href="<?php echo $offer_status_content['button_value']; ?>" class="a-button<?php echo $button_class; ?>"<?php echo $button_attr; ?>><?php echo $offer_status_content['button_label']; ?></a>
												<?php endif; ?>
											</div>
										<?php endif; ?>

										<?php if ( null !== $post->more_info_text ) : ?>
											<?php if ( null !== $post->more_info_url ) : ?>
												<a href="<?php echo $post->more_info_url; ?>" class="a-partner-offer-learn-more">
											<?php else : ?>
												<p class="a-partner-offer-learn-more">
											<?php endif; ?>
											<?php echo $post->more_info_text; ?>
											<?php if ( null !== $post->more_info_url ) : ?>
												</a>
											<?php else : ?>
												</p>
											<?php endif; ?>
										<?php endif; ?>

									</div>
								</article>
							<?php endforeach; ?>
						</fieldset>
					</form>
				<?php else : ?>
					<?php echo get_option( $minnpost_membership->option_prefix . 'account-benefits-partner-offers_no_offers', '' ); ?>
				<?php endif; ?>
			</section>
		</main><!-- #main -->
	</div><!-- #primary -->

<?php
get_footer();
