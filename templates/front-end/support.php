<?php
/**
 * The template for displaying support pages
 *
 */
get_header(); ?>

	<div id="primary" class="m-layout-primary o-membership o-support">
		<main id="main" class="site-main" role="main">
			<?php
			global $minnpost_membership;
			$use_member_levels = get_option( $minnpost_membership->option_prefix . 'use_member_levels', false );
			?>
			<?php if ( 1 === intval( $use_member_levels ) ) : ?>
				start donating
			<?php endif; ?>
		</main><!-- #main -->

	</div><!-- #primary -->

<?php
get_footer();
