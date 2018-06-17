<?php
/**
 * The template for displaying the partner offer claim page
 *
 */
get_header(); ?>
<?php
global $minnpost_membership;
$user_state = $minnpost_membership->user_info->get_user_access( '', 'support-partner-offers' )['state'];
?>

	<div id="primary" class="m-layout-membership o-fan-club m-page">
		<main id="main" class="site-main" role="main">
			<header class="m-entry-header m-entry-header-singular">
				<h1 class="a-entry-title"><?php echo get_option( $minnpost_membership->option_prefix . 'account-benefits-partner-offers_title', '' ); ?></h1>
			</header>
			<section class="m-entry-content m-partner-offers">
				<?php $offers = $minnpost_membership->content_items->get_partner_offers(); ?>
				<?php if ( $offers ) : ?>
					<form action="<?php echo admin_url( 'admin-ajax.php' ); ?>" method="post" class="m-form m-form-membership m-form-membership-partner-offers">
						<input type="hidden" name="action" value="benefit_form_submit">
						<input type="hidden" name="minnpost_membership_benefit_form_nonce" value="<?php echo wp_create_nonce( 'mem-form-nonce' ); ?>">
						<input type="hidden" name="current_url" value="<?php echo rtrim( parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ), '/' ); ?>">
						<input type="hidden" name="benefit-name" value="partner-offers">
						<fieldset>
							<?php global $post; ?>
							<?php foreach ( $offers as $post ) : ?>
								<article id="partner-offer-<?php the_ID(); ?>" <?php post_class( 'm-partner-offer' ); ?>>
									<?php setup_postdata( $post ); ?>
									<?php $minnpost_membership->content_items->partner_offer_image( $post->post_parent ); ?>
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
											<div class="m-benefit-claim">
												<div class="m-benefit-message m-benefit-message-info" data-message-already-claimed-<?php the_ID(); ?>="You have successfully claimed this offer. You will receive an email with further details shortly." data-message-all-claimed="All of the tickets for this offer were already claimed. Try another offer."></div>
												<?php if ( 0 < $post->instance_count ) : ?>
													<?php if ( 1 === $post->instance_count ) : ?>
														<input type="hidden" name="instance-id-<?php the_ID(); ?>" value="0">
													<?php else : ?>
														<?php foreach ( $post->instances as $key => $instance ) : ?>
															<?php if ( ! isset( $instance['_mp_partner_offer_claimed_date'] ) || '' === $instance['_mp_partner_offer_claimed_date'] ) : ?>
																<input type="hidden" name="instance-id-<?php the_ID(); ?>" value="<?php echo $key; ?>">
																<?php break; ?>
															<?php endif; ?>
														<?php endforeach; ?>
													<?php endif; ?>
													<button type="submit" value="<?php the_ID(); ?>" name="post_id" class="a-button a-benefit-button">Claim Now</button>
												<?php else : ?>
													<button type="submit" value="claimed" name="post_id" class="a-button a-benefit-button a-button-disabled" disabled="disabled">All Claimed</button>
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
					<?php get_template_part( 'template-parts/content', 'none' ); ?>
				<?php endif; ?>
			</section>
		</main><!-- #main -->
	</div><!-- #primary -->

<?php
get_footer();
