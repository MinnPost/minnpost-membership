<table class="widefat striped">
	<thead>
		<tr>
			<th><?php echo esc_html__( 'Offer', 'minnpost-membership' ); ?></th>
			<th><?php echo esc_html__( 'Instance Number', 'minnpost-membership' ); ?></th>
			<th><?php echo esc_html__( 'Claimed Date/Time', 'minnpost-membership' ); ?></th>
			<th colspan="3"><?php echo esc_html__( 'Claiming User', 'minnpost-membership' ); ?></th></th>
		</tr>
	</thead>
	<tfoot>
		<tr>
			<td colspan="6">
				<p><?php echo sprintf( 'These are all of the currently published offers with claims. Once an offer is unpublished, its claims will not be displayed on this page. After that, use the <a href="%1$s">%2$s</a> to see all partner offers.', admin_url( '/edit.php?post_type=partner_offer' ), 'partner offers archive' ); ?></p>
			</td>
		</tr>
	<tbody>
		<?php foreach ( $offers as $key => $offer ) : ?>
			<?php foreach ( $offer->instances as $i_key => $instance ) : ?>
				<tr>
					<th><a href="<?php echo get_edit_post_link( $offer->ID ); ?>"><?php echo wp_date( 'Y-m', strtotime( $offer->claimable_start_date ) ); ?> <?php echo $offer->post_title; ?></a></th>
					<td><?php echo $i_key + 1; ?></td>
					<td><?php echo wp_date( 'Y-m-d @ g:i:sa', $instance['_mp_partner_offer_claimed_date'] ); ?></td>
					<td><a href="<?php echo get_edit_user_link( $instance['_mp_partner_offer_claim_user']['id'] ); ?>"><?php echo $instance['user']->display_name; ?></a></td>
					<td><?php echo $instance['user']->user_email; ?></td>
					<td>
						<?php if ( isset( $instance['user_meta']['_street_address'] ) ) : ?>
							<div><?php echo $instance['user_meta']['_street_address'][0]; ?></div>
						<?php endif; ?>
						<?php if ( isset( $instance['user_meta']['_city'] ) || isset( $instance['user_meta']['_state'] )  || isset( $instance['user_meta']['_zip_code'] ) ) : ?>
							<?php if ( '-- N/A --' === $instance['user_meta']['_state'][0] ) : ?>
								<?php unset( $instance['user_meta']['_state'] ); ?>
							<?php endif; ?>
							<div>
								<?php if ( isset( $instance['user_meta']['_city'] ) ) : ?>
									<?php echo $instance['user_meta']['_city'][0]; ?><?php endif; ?><?php if ( isset( $instance['user_meta']['_city'] ) && isset( $instance['user_meta']['_state'] ) ) : ?>, <?php endif; ?>
								<?php if ( isset( $instance['user_meta']['_state'] ) ) : ?>
									<?php echo $instance['user_meta']['_state'][0]; ?>
								<?php endif; ?>
								<?php if ( isset( $instance['user_meta']['_zip_code'] ) ) : ?>
									<?php echo $instance['user_meta']['_zip_code'][0]; ?>
								<?php endif; ?>
							</div>
						<?php endif; ?>
					</td>
				</tr>
			<?php endforeach; ?>
		<?php endforeach; ?>
	</tbody>
</table>
