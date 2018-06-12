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
			<section class="m-partner-offers">
				<?php $offers = $minnpost_membership->content_items->get_partner_offers(); ?>
				<?php if ( $offers ) : ?>
					<?php global $post; ?>
					<?php foreach ( $offers as $post ) : ?>
						<article id="partner-offer-<?php the_ID(); ?>" <?php post_class( 'm-partner-offer' ); ?>>
							<?php setup_postdata( $post ); ?>
							<header class="m-entry-header m-partner-offer-header">
								<?php the_title( '<h1 class="a-entry-title">', '</h1>' ); ?>
							</header>
							<div class="m-entry-content">
								<p>this is an offer</p>
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
