<?php
/**
 * The template for displaying support pages
 *
 */
get_header(); ?>
<?php
global $minnpost_membership;
?>

	<div id="primary" class="m-layout-membership o-support">
		<main id="main" class="site-main" role="main">
			<header class="m-membership-intro">
				<h1 class="a-standalone-title"><?php echo get_option( $minnpost_membership->option_prefix . 'support_title', '' ); ?></h1>
			</header>
			<div class="m-entry-content">
				<form action="<?php echo admin_url( 'admin-ajax.php' ); ?>" method="post" class="m-form m-form-membership m-form-membership-support">
					<input type="hidden" name="action" value="membership_form_submit">
					<input type="hidden" name="minnpost_membership_form_nonce" value="<?php echo wp_create_nonce( 'mem-form-nonce' ); ?>">
					<?php $url_params = $minnpost_membership->front_end->url_parameters; ?>
					<?php if ( ! empty( $url_params ) ) : ?>
						<?php foreach ( $url_params as $key => $value ) : ?>
							<input type="hidden" name="<?php echo $key; ?>" value="<?php echo $value; ?>">
						<?php endforeach; ?>
					<?php endif; ?>
				</form>
			</div>
		</main><!-- #main -->

	</div><!-- #primary -->

<?php
get_footer();
