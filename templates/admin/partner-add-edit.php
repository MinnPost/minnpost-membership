<h3>
	<?php
	echo sprintf( ucfirst( str_replace( '-', ' ', $method ) ) );
	?>
</h3>
<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="minnpost-partner" enctype="multipart/form-data">
	<input type="hidden" name="redirect_url_error" value="<?php echo esc_url( $error_url ); ?>" />
	<input type="hidden" name="redirect_url_success" value="<?php echo esc_url( $success_url ); ?>" />
	<?php if ( isset( $transient ) ) { ?>
	<input type="hidden" name="transient" value="<?php echo esc_html( $transient ); ?>" />
	<?php } ?>
	<input type="hidden" name="action" value="post_partner" >
	<input type="hidden" name="method" value="<?php echo esc_attr( $method ); ?>" />
	<?php if ( 'edit-partner' === $method ) { ?>
	<input type="hidden" name="partner_id" value="<?php echo absint( $partner_id ); ?>" />
	<?php } ?>

	<div class="minnpost-partner-post_title">
		<label for="post_title"><?php echo esc_html__( 'Name', 'minnpost-membership' ); ?>: </label>
		<input type="text" id="post_title" name="post_title" required value="<?php echo isset( $partner->post_title ) ? esc_html( $partner->post_title ) : ''; ?>">
	</div>

	<div class="minnpost-partner-_mp_partner_link_url">
		<label for="_mp_partner_link_url"><?php echo esc_html__( 'Link URL', 'minnpost-membership' ); ?>: </label>
		<input type="url" id="_mp_partner_link_url" name="_mp_partner_link_url" required value="<?php echo isset( $partner->meta['_mp_partner_link_url'] ) ? esc_url( $partner->meta['_mp_partner_link_url'][0] ) : ''; ?>">
	</div>

	<div class="minnpost-partner-logo">
		<label for="logo"><?php echo esc_html__( 'Logo', 'minnpost-membership' ); ?>: </label>
		<input type="file" id="logo" name="logo" required>
		<?php
		$attachment_id = $partner->meta['_mp_partner_logo_image_id'][0];
		echo $attachment_id;
		echo wp_get_attachment_image( $attachment_id );
		?>
	</div>

	<?php
		submit_button(
			sprintf( ucfirst( str_replace( '-', ' ', $method ) ) )
		);
	?>
</form>
