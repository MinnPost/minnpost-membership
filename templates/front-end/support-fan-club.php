<?php
/**
 * The template for displaying support pages
 *
 */
get_header(); ?>
<?php
global $minnpost_membership;
?>

	<div id="primary" class="m-layout-membership o-fan-club m-page">
		<main id="main" class="site-main" role="main">
			<header class="m-entry-header m-entry-header-singular">
				<h1 class="a-entry-title"><?php echo get_option( $minnpost_membership->option_prefix . 'support-fan-club_title', '' ); ?></h1>
			</header>
			<section class="m-entry-content">
				<?php echo wpautop( get_option( $minnpost_membership->option_prefix . 'support-fan-club_body', '' ) ); ?>
			</section>
			<aside class="m-entry-content">
				<?php
				if ( '' !== get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_link_from_other_pages' ) ) {
					echo sprintf( '<p class="member-benefit-details-link">%1$s</p>',
						get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_link_from_other_pages' )
					);
				}
				?>
			</aside>
		</main><!-- #main -->

	</div><!-- #primary -->

<?php
get_footer();
