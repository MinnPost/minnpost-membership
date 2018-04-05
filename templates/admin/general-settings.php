<form method="post" action="options.php">
	<?php
	settings_fields( 'member_levels' ) . do_settings_sections( $this->slug . '-settings' );
	?>
	<?php submit_button( __( 'Save settings', 'minnpost-membership' ) ); ?>
</form>
<?php
$use_member_levels = get_option( $this->option_prefix . 'use_member_levels', false );
$all_member_levels = get_option( $this->option_prefix . 'member_levels', array() );
?>
<?php if ( 1 === intval( $use_member_levels ) ) : ?>
	<section class="minnpost-membership-member-levels">
		<h3><?php echo esc_html__( 'Current member levels', 'minnpost-membership' ); ?> <a class="page-title-action" href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=add-member-level' ) ); ?>"><?php echo esc_html__( 'Add New', 'minnpost-membership' ); ?></a></h3>

		<?php if ( ! empty( $all_member_levels ) ) : ?>
			<?php foreach ( $member_levels as $key => $record ) : ?>
				<article class="minnpost-membership-member-level minnpost-membership-member-level-<?php echo $record['slug']; ?>">
					<header>
						<h4><?php echo esc_html( $record['name'] ); ?></h4>
						<?php if ( 1 !== intval( $record['is_nonmember'] ) ) : ?>
							<div class="amount">
								<?php if ( 1 === $record['minimum_monthly_amount'] ) : ?>
									<h5><?php echo html_entity_decode( '<' ) . html_entity_decode( '$' ) . ( $record['maximum_monthly_amount'] + 1 ); ?></h5>
								<?php elseif ( '' === $record['maximum_monthly_amount'] ) : ?>
									<h5><?php echo html_entity_decode( '$' ) . $record['minimum_monthly_amount'] . html_entity_decode( '+' ); ?></h5>
								<?php else : ?>
									<h5><?php echo html_entity_decode( '$' ) . $record['minimum_monthly_amount'] . html_entity_decode( '-' ) . $record['maximum_monthly_amount']; ?></h5>
								<?php endif; ?>
								<p><?php echo $this->get_frequency_options( get_option( $this->option_prefix . 'default_frequency', '' )[0] )['text']; ?></p>
							</div>
						<?php endif; ?>
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

		<table class="widefat striped">
			<thead>
				<tr>
					<th><?php echo esc_html__( 'Name', 'minnpost-membership' ); ?></th>
					<th><?php echo esc_html__( 'Minimum monthly mount', 'minnpost-membership' ); ?></th>
					<th><?php echo esc_html__( 'Maximum monthly amount', 'minnpost-membership' ); ?></th>
					<th colspan="2"><?php echo esc_html__( 'Actions', 'minnpost-membership' ); ?></th>
				</tr>
			</thead>
			<tbody>
				<?php if ( count( $member_levels ) > 0 ) : ?>
					<?php foreach ( $member_levels as $key => $record ) { ?>
				<tr>
					<td><?php echo esc_html( $record['name'] ); ?></td>
					<td><?php echo esc_html( $record['minimum_monthly_amount'] ); ?></td>
					<td><?php echo esc_html( $record['maximum_monthly_amount'] ); ?></td>
					<td>
						<a href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=edit-member-level&id=' . $key ) ); ?>"><?php echo esc_html__( 'Edit', 'minnpost-membership' ); ?></a>
					</td>
					<td>
						<a href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=delete-member-level&id=' . $key ) ); ?>"><?php echo esc_html__( 'Delete', 'minnpost-membership' ); ?></a>
					</td>
				</tr>
					<?php } ?>
				<?php else : ?>
				<tr>
					<td colspan="4">
						<p>
						<?php
							// translators: the placeholders refer to: 1) the url to add a member level, 2) the add member level link text
							echo sprintf( esc_html__( 'No member levels exist yet. You can ', 'object-sync-for-salesforce' ) . '<a href="%1$s">%2$s</a>.',
								esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=add-member-level' ) ),
								esc_html__( 'add one' )
							);
						?>
						</p>
					</td>
				</tr>
				<?php endif; ?>
			</tbody>
		</table>
	</section>
<?php endif; ?>
