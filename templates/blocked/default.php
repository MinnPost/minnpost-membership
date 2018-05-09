<?php
/**
 * The template for displaying blocked content
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/#single-post
 *
 * @package MinnPost Membership
 */

get_header(); ?>

	<div id="primary" class="m-layout-primary">
		<main id="main" class="site-main" role="main">
			<header class="m-entry-header">
				<h1 class="a-entry-title"><?php echo __( 'You do not have access to this content.', 'minnpost-membership' ); ?></h1>
			</header>
		</main><!-- #main -->
	</div><!-- #primary -->

<?php
get_sidebar();
get_footer();
