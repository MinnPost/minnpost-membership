<?php
/**
 * The template for displaying the fan club vote page
 *
 */
get_header(); ?>
<?php
$minnpost_membership = minnpost_membership();
$user_state          = $minnpost_membership->user_info->get_user_access( '', 'support-fan-club' )['state'];
?>

	<div id="primary" class="m-layout-membership o-fan-club m-page">
		<main id="main" class="site-main" role="main">
			<header class="m-entry-header m-entry-header-singular">
				<h1 class="a-entry-title"><?php echo get_option( $minnpost_membership->option_prefix . 'account-benefits-fan-club_title', '' ); ?></h1>
			</header>
		</main><!-- #main -->
	</div><!-- #primary -->

<?php
get_footer();
