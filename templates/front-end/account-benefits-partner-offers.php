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
										<div class="m-benefit-message m-benefit-message-info" data-message-all-claimed="All of the tickets for this offer were already claimed. Try another offer."></div>
										<?php if ( 0 < $post->instance_count ) : ?>
										<?php else : ?>
											<button type="submit" value="claimed" name="instance_id" class="a-button a-benefit-button a-button-disabled" disabled="disabled">All Claimed</button>
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
				<?php else : ?>
					<?php get_template_part( 'template-parts/content', 'none' ); ?>
				<?php endif; ?>
			</section>
		</main><!-- #main -->
	</div><!-- #primary -->

<?php
get_footer();
