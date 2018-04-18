<form method="post" action="options.php" class="minnpost-membership-general-settings">
	<?php
	settings_fields( 'member_levels' ) . settings_fields( 'more_settings' ) . do_settings_sections( $this->slug . '-settings' );
	?>
	<?php submit_button( __( 'Save settings', 'minnpost-membership' ) ); ?>
</form>
<?php $use_member_levels = get_option( $this->option_prefix . 'use_member_levels', false ); ?>
<?php if ( 1 === intval( $use_member_levels ) ) : ?>
	<section class="minnpost-membership-member-levels">
		<h3><?php echo esc_html__( 'Current member levels', 'minnpost-membership' ); ?> <a class="page-title-action" href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=add-member-level' ) ); ?>"><?php echo esc_html__( 'Add New', 'minnpost-membership' ); ?></a></h3>

		<?php
		$all_member_levels = $this->member_levels->get_member_levels( '', true );
		if ( ! empty( $all_member_levels ) ) :
		?>
			<?php foreach ( $all_member_levels as $key => $record ) : ?>
				<?php $ranges = $this->member_levels->calculate_ranges( $record ); ?>
				<article class="minnpost-membership-member-level minnpost-membership-member-level-<?php echo $record['slug']; ?>">
					<header class="member-level-brief">
						<h4><?php echo esc_html( $record['name'] ); ?></h4>
						<?php if ( 1 !== intval( $record['is_nonmember'] ) ) : ?>
							<div class="amount">
								<h5 data-one-time="<?php echo $ranges['yearly']; ?>" data-year="<?php echo $ranges['yearly']; ?>" data-month="<?php echo $ranges['monthly']; ?>">
									<?php echo $ranges[ $this->member_levels->get_frequency_options( get_option( $this->option_prefix . 'default_frequency', '' ) )['id'] ]; ?>
								</h5>
								<?php if ( '' !== get_option( $this->option_prefix . 'default_frequency', '' ) ) : ?>
									<p><?php echo $this->member_levels->get_frequency_options( get_option( $this->option_prefix . 'default_frequency', '' ) )['text']; ?></p>
								<?php endif; ?>
							</div>
						<?php endif; ?>

						<small><a href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=edit-member-level&id=' . $key ) ); ?>"><?php echo esc_html__( 'Edit', 'minnpost-membership' ); ?></a> | <a href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=delete-member-level&id=' . $key ) ); ?>"><?php echo esc_html__( 'Delete', 'minnpost-membership' ); ?></a></small>
					</header>
				</article>
			<?php endforeach; ?>
		<?php else : ?>
			<p>
				<?php
					// translators: the placeholders refer to: 1) the url to add a member level, 2) the add member level link text
					echo sprintf( esc_html__( 'No member levels exist yet. You can ', 'object-sync-for-salesforce' ) . '<a href="%1$s">%2$s</a>.',
						esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=add-member-level' ) ),
						esc_html__( 'add one' )
					);
				?>
			</p>
		<?php endif; ?>
	</section>
<?php endif; ?>
