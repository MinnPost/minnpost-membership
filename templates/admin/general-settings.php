<h3><?php echo esc_html__( 'Member levels', 'minnpost-membership' ); ?> <a class="page-title-action" href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=add-member-level' ) ); ?>"><?php echo esc_html__( 'Add New', 'minnpost-membership' ); ?></a></h3>
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
