<div id="main" class="minnpost-membership-general-settings">
	<form method="post" action="options.php">
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
					<article class="minnpost-membership-member-level minnpost-membership-member-level-<?php echo $record['slug']; ?> minnpost-membership-member-level-<?php echo $key + 1; ?>">
						<header class="member-level-brief">
							<h4><?php echo esc_html( $record['name'] ); ?></h4>

							<?php
							$default_frequency = get_option( $this->option_prefix . 'default_frequency', '' )[0];
							$default_amount    = $record['starting_value'];

							?>

							<?php if ( 1 !== intval( $record['is_nonmember'] ) ) : ?>
								<div class="amount">
									<h5 data-one-time="<?php echo $ranges['yearly']; ?>" data-year="<?php echo $ranges['yearly']; ?>" data-month="<?php echo $ranges['monthly']; ?>" data-default-monthly="<?php echo $ranges['default_monthly']; ?>" data-default-yearly="<?php echo $ranges['default_yearly']; ?>">
									<?php
									$current_frequency = $this->member_levels->get_frequency_options( $default_frequency );
									echo $ranges[ $current_frequency['id'] ];
									?>
									</h5>
									<?php if ( '' !== $current_frequency['text'] ) : ?>
										<p class="show-frequency"><?php echo $current_frequency['text']; ?></p>
									<?php endif; ?>

								</div>
								<div class="enter">
									<input class="amount-entry" type="hidden" id="amount-level-<?php echo $key + 1; ?>" name="amount-level-<?php echo $key + 1; ?>" value="<?php echo $record['starting_value']; ?>" data-member-level-number="<?php echo $key + 1; ?>"<?php if ( '' !== $record['minimum_monthly_amount'] ) {?> min="<?php echo $record['minimum_monthly_amount']; ?>"<?php } ?>>
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
</div>
