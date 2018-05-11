<?php
/**
 * The template for displaying blocked single post content
 *
 * @link https://developer.wordpress.org/themes/basics/template-hierarchy/#single-post
 *
 * @package MinnPost Membership
 */

get_header(); ?>

<?php
global $minnpost_membership;
$user_state = $minnpost_membership->user_info->get_user_access( '' )['state'];
?>

	<div id="primary" class="m-layout-primary">
		<main id="main" class="site-main" role="main">

			<article id="post-<?php the_ID(); ?>" <?php post_class( array( 'm-post', 'm-post-blocked' ) ); ?>>

				<header class="m-entry-header<?php if ( is_singular() ) { ?> m-entry-header-singular<?php } ?><?php if ( is_single() ) { ?> m-entry-header-single<?php } ?>">
					<?php
					if ( is_single() ) :
						the_title( '<h1 class="a-entry-title">', '</h1>' );
					else :
						the_title( '<h3 class="a-entry-title"><a href="' . esc_url( get_permalink() ) . '" rel="bookmark">', '</a></h2>' );
					endif;
					?>
				</header><!-- .m-entry-header -->

				<div class="m-entry-content">
					<?php echo wpautop( apply_filters( 'the_content', $minnpost_membership->front_end->get_option_based_on_user_status( $minnpost_membership->option_prefix . 'post_access_blocked_message', $user_state ) ) ); ?>
				</div><!-- .m-entry-content -->

			</article><!-- #post-## -->


		</main><!-- #main -->
	</div><!-- #primary -->

<?php
get_sidebar();
get_footer();
