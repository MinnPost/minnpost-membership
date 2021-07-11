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
		<p class="a-button a-support-button<?php echo $attributes['button_class']; ?>"><a href="<?php echo $attributes['button_url']; ?>"><!--[if mso]><i style="letter-spacing: 25px;mso-font-width:-100%;mso-text-raise:20pt">&nbsp;</i><![endif]--><span style="mso-text-raise:10pt;font-weight:bold;"><?php echo $attributes['button_text']; ?></span><!--[if mso]><i style="letter-spacing: 25px;mso-font-width:-100%">&nbsp;</i><![endif]--></a></p>
	<?php else : ?>
		<?php do_action( 'minnpost_membership_email_header_support' ); ?>
	<?php endif; ?>
</div>
