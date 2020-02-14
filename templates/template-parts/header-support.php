<?php
/**
 * Template part for displaying support content at the top right of the site
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package MinnPost Membership
 */

?>

<div class="m-support-cta m-support-cta-top">
	<h2 class="a-support-tagline"><?php echo $attributes['tagline_text']; ?></h2>
	<?php if ( false !== $attributes['show_button'] ) : ?>
		<a class="a-button a-support-button<?php echo $attributes['button_class']; ?>" href="<?php echo $attributes['button_url']; ?>"><?php echo $attributes['button_text']; ?></a>
	<?php endif; ?>
</div>
