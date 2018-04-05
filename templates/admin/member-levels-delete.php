<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
	<input type="hidden" name="redirect_url_error" value="<?php echo esc_url( $error_url ); ?>" />
	<input type="hidden" name="redirect_url_success" value="<?php echo esc_url( $success_url ); ?>" />
	<input type="hidden" name="id" value="<?php echo absint( $id ); ?>" />
	<input type="hidden" name="action" value="delete_member_level">
	<h2><?php echo esc_html__( 'Are you sure you want to delete this member level?', 'minnpost-membership' ); ?></h2>
	<p>
	<?php
		// translators: the placeholders refer to: 1) the member level name
		echo sprintf( esc_html__( 'This member level is called %1$s.', 'minnpost-membership' ),
			'<strong> ' . esc_html( $member_level['name'] ) . '</strong>'
		);
	?>
	</p>
	<?php submit_button( esc_html__( 'Confirm deletion', 'minnpost-membership' ) ); ?>
</form>
