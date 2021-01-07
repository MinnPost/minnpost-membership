<?php
/**
 * Template part for displaying support content in the email template
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package MinnPost Membership
 */

?>

<div class="o-column m-support-cta">
	<?php if ( false !== $attributes['show_button'] ) : ?>
		<table class="a-button a-support-button<?php echo $attributes['button_class']; ?>" cellspacing="0" cellpadding="0">
			<tbody>
				<tr>
					<td>
						<table cellspacing="0" cellpadding="0">
							<tbody>
								<tr>
									<td align="center">
										<a href="<?php echo $attributes['button_url']; ?>"><!--[if mso]>&nbsp;<![endif]--><?php echo $attributes['button_text']; ?><!--[if mso]>&nbsp;<![endif]--></a>
									</td>
								</tr>
							</tbody>
						</table>
					</td>
				</tr>
			</tbody>
		</table>
	<?php else : ?>
		<?php do_action( 'minnpost_membership_email_header_support' ); ?>
	<?php endif; ?>
</div>
