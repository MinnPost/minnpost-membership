<?php
/**
 * The template for displaying support pages
 *
 */
get_header(); ?>
<?php
global $minnpost_membership;
$user_state = $minnpost_membership->user_info->get_user_state( '', 'support-fan-club' );
?>

	<div id="primary" class="m-layout-membership o-fan-club m-page">
		<main id="main" class="site-main" role="main">
			<header class="m-entry-header m-entry-header-singular">
				<h1 class="a-entry-title"><?php echo get_option( $minnpost_membership->option_prefix . 'support-fan-club_title', '' ); ?></h1>
			</header>
			<section class="m-entry-content">
				<?php echo wpautop( get_option( $minnpost_membership->option_prefix . 'support-fan-club_body', '' ) ); ?>
			</section>
			<section class="m-membership-action m-membership-action-fan-club">
				<?php if ( '' !== $minnpost_membership->front_end->get_option_based_on_user_status( $minnpost_membership->option_prefix . 'support-fan-club_action_title' ) ) : ?>
					<h2><?php echo $minnpost_membership->front_end->get_option_based_on_user_status( $minnpost_membership->option_prefix . 'support-fan-club_action_title' ); ?></h2>
				<?php endif; ?>
				<?php if ( '' !== $minnpost_membership->front_end->get_option_based_on_user_status( $minnpost_membership->option_prefix . 'support-fan-club_action_body' ) ) : ?>
					<?php echo wpautop( $minnpost_membership->front_end->get_option_based_on_user_status( $minnpost_membership->option_prefix . 'support-fan-club_action_body' ) ); ?>
				<?php endif; ?>
				<div class="m-form-actions m-membership-form-actions">
					<?php $minnpost_membership->front_end->button( 'support-fan-club', 'body', $user_state ); ?>
					<?php $minnpost_membership->front_end->link_next_to_button( 'support-fan-club', 'body', $user_state ); ?>
				</div>
			</section>
			<aside class="m-entry-content">
				<?php
				if ( '' !== get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_link_from_other_pages', '' ) && '' !== get_option( $minnpost_membership->option_prefix . 'support-fan-club_post_body_show_member_details_link', '' ) ) {
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
