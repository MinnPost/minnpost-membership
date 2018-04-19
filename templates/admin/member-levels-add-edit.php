<h3>
	<?php
	// translators: the placeholder refers to the currently selected method (add, edit, or clone)
	echo sprintf( esc_html__( '%1$s member level', 'minnpost-membership' ), ucfirst( str_replace( '-member-level', '', $method ) ) );
	?>
</h3>
<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" class="minnpost-member-level">
	<input type="hidden" name="redirect_url_error" value="<?php echo esc_url( $error_url ); ?>" />
	<input type="hidden" name="redirect_url_success" value="<?php echo esc_url( $success_url ); ?>" />
	<?php if ( isset( $transient ) ) { ?>
	<input type="hidden" name="transient" value="<?php echo esc_html( $transient ); ?>" />
	<?php } ?>
	<input type="hidden" name="action" value="post_member_level" >
	<input type="hidden" name="method" value="<?php echo esc_attr( $method ); ?>" />
	<?php if ( 'edit-member-level' === $method ) { ?>
	<input type="hidden" name="id" value="<?php echo absint( $id ); ?>" />
	<?php } ?>

	<div class="minnpost-member-level-name">
		<label for="name"><?php echo esc_html__( 'Name', 'minnpost-membership' ); ?>: </label>
		<input type="text" id="name" name="name" required value="<?php echo isset( $name ) ? esc_html( $name ) : ''; ?>" />
	</div>

	<div class="minnpost-member-level-is-nonmember">
		<label for="is-nonmember"><?php echo esc_html__( 'Non-member level?', 'minnpost-membership' ); ?>: </label>
		<?php
		if ( isset( $is_nonmember ) && 1 === $is_nonmember ) {
			$checked = ' checked';
		} else {
			$checked = '';
		}
		?>
		<input type="checkbox" id="is-nonmember" name="is_nonmember" value="1"<?php echo $checked; ?> />
	</div>

	<div class="minnpost-member-level-minimum-amount">
		<label for="minimum-amount"><?php echo esc_html__( 'Minimum monthly amount', 'minnpost-membership' ); ?>: </label>
		<input type="tel" id="minimum-amount" name="minimum_monthly_amount" value="<?php echo isset( $minimum_monthly_amount ) ? esc_attr( $minimum_monthly_amount ) : ''; ?>" />
	</div>

	<div class="minnpost-member-level-maximum-amount">
		<label for="maximum-amount"><?php echo esc_html__( 'Maximum monthly amount', 'minnpost-membership' ); ?>: </label>
		<input type="tel" id="maximum-amount" name="maximum_monthly_amount" value="<?php echo isset( $maximum_monthly_amount ) ? esc_attr( $maximum_monthly_amount ) : ''; ?>" />
	</div>

	<div class="minnpost-member-level-starting-value">
		<label for="starting-value"><?php echo esc_html__( 'Starting monthly value', 'minnpost-membership' ); ?>: </label>
		<input type="tel" id="starting-value" name="starting_value" value="<?php echo isset( $starting_value ) ? esc_attr( $starting_value ) : ''; ?>" />
	</div>

	<div class="minnpost-member-level-benefits">
		<label for="benefits"><?php echo esc_html__( 'Benefits', 'minnpost-membership' ); ?>: </label>
		<textarea id="benefits" name="benefits"><?php echo isset( $benefits ) ? esc_html( $benefits ) : ''; ?></textarea>
	</div>
	<?php
		submit_button(
			// translators: the placeholder refers to the currently selected method (add, edit, or clone)
			sprintf( esc_html__( '%1$s member level', 'minnpost-membership' ), ucfirst( str_replace( '-member-level', '', $method ) ) )
		);
	?>
</form>
