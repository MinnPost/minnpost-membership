<div class="minnpost-membership-benefit-content-partner-offers">
	<section class="minnpost-membership-partners">
		<h3><?php echo esc_html__( 'Partners', 'minnpost-membership' ); ?> <a class="page-title-action" href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=add-partner' ) ); ?>"><?php echo esc_html__( 'Add New Partner', 'minnpost-membership' ); ?></a></h3>
		<?php if ( $content->have_posts() ) : ?>
			<table class="widefat striped">
				<thead>
					<tr>
						<th><?php echo esc_html__( 'Title', 'minnpost-membership' ); ?></th>
						<th><?php echo esc_html__( 'Status', 'minnpost-membership' ); ?></th>
						<th colspan="2"><?php echo esc_html__( 'Partner Actions', 'minnpost-membership' ); ?></th>
						<th colspan="2"><?php echo esc_html__( 'Partner Offer Actions', 'minnpost-membership' ); ?></th>
					</tr>
				</thead>
				<tfoot>
					<tr>
						<td colspan="6">
							<p><small>&nbsp;</small></p>
						</td>
					</tr>
				</tfoot>
				<tbody>
					<?php while ( $content->have_posts() ) : $content->the_post(); ?>
						<tr>
							<td>
								<?php the_title(); ?>
							</td>
							<td><?php echo get_post_status(); ?></td>
							<td>
								<a href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=edit-partner&partner_id=' . get_the_ID() ) ); ?>"><?php echo esc_html__( 'Edit', 'minnpost-membership' ); ?></a>
							</td>
							<td>
								<a href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=delete-partner&partner_id=' . get_the_ID() ) ); ?>"><?php echo esc_html__( 'Delete', 'minnpost-membership' ); ?></a>
							</td>
							<td>
								<a href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=add-partner-offer&partner_id=' . get_the_ID() ) ); ?>"><?php echo esc_html__( 'Add new offer', 'minnpost-membership' ); ?></a>
							</td>
							<td>
								<a href="<?php echo esc_url( get_admin_url( null, 'admin.php?page=' . $page . '&method=list-partner-offers&partner_id=' . get_the_ID() ) ); ?>"><?php echo esc_html__( 'List offers', 'minnpost-membership' ); ?></a>
							</td>
						</tr>
					<?php endwhile; ?>
				</tbody>
			<?php wp_reset_postdata(); ?>
		<?php endif; ?>
	</section>
</div>

