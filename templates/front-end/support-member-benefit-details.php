<?php
/**
 * The template for displaying support pages
 *
 */
get_header(); ?>
<?php
$minnpost_membership = minnpost_membership();
?>

	<div id="primary" class="m-layout-membership m-page">
		<main id="main" class="site-main" role="main">
			<header class="m-entry-header m-entry-header-singular">
				<h1 class="a-entry-title"><?php echo get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_title', '' ); ?></h1>
			</header>
			<div class="m-entry-content">
				<?php echo apply_filters( 'the_content', get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_body', '' ) ); ?>
			</div>
		</main><!-- #main -->

	</div><!-- #primary -->

<?php
get_footer();
