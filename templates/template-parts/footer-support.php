<?php
/**
 * Template part for displaying support content at the bottom right of the site
 *
 * @link https://codex.wordpress.org/Template_Hierarchy
 *
 * @package MinnPost Membership
 */

?>

<section class="m-support-cta m-support-cta-bottom">
	<?php
	$minnpost_membership = minnpost_membership();
	$url_params          = $minnpost_membership->front_end->process_membership_parameters( 'get' );
	$user_id             = get_current_user_id();
	?>
	<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_title', '' ) ) : ?>
		<header class="m-membership-intro m-membership-support-intro">
			<h1 class="a-standalone-title"><?php echo get_option( $minnpost_membership->option_prefix . 'support_title', '' ); ?></h1>
		</header>
	<?php endif; ?>
	<form action="<?php echo $attributes['donate_url']; ?>" method="get" class="m-form m-form-membership m-form-membership-support">
		<?php if ( '' !== $attributes['footer_intro_text'] ) : ?>
			<?php echo wpautop( $attributes['footer_intro_text'] ); ?>
		<?php endif; ?>
		<section class="m-membership-fast-select">
			<fieldset>
				<div class="m-form-item-wrap">
					<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'pre_select_text', '' ) ) : ?>
						<span class="a-fast-select-intro"><?php echo get_option( $minnpost_membership->option_prefix . 'pre_select_text', '' ); ?></span>
					<?php endif; ?>
					<div class="m-amount-group">
						<label for="amount" class="a-fast-select-currency">&dollar;</label>
						<div id="amount-item" class="m-form-item">
							<?php
							if ( isset( $url_params['amount'] ) ) {
								$amount = $url_params['amount'];
							} elseif ( '' !== get_option( $minnpost_membership->option_prefix . 'support_start_value', '' ) ) {
								$amount = get_option( $minnpost_membership->option_prefix . 'support_start_value', '' );
							}
							?>
							<input id="amount" min="1" name="amount" value="<?php echo $amount; ?>" type="number">
						</div>
					</div>
					<?php
					$frequency_options = $minnpost_membership->member_levels->get_frequency_options();
					?>
					<?php if ( ! empty( $frequency_options ) ) : ?>
						<div class="m-form-radios">
							<?php foreach ( $frequency_options as $key => $option ) : ?>
								<?php
								$id_key = $key + 1;

								if ( isset( $url_params['frequency'] ) ) {
									$frequency = $minnpost_membership->member_levels->get_frequency_options( $url_params['frequency'], 'id' )['value'];
								} elseif ( '' !== get_option( $minnpost_membership->option_prefix . 'default_frequency', '' )[0] ) {
									$frequency = get_option( $minnpost_membership->option_prefix . 'default_frequency', '' )[0];
								} else {
									$frequency = '';
								}

								if ( $frequency === $option['value'] ) {
									$checked = ' checked';
								} else {
									$checked = '';
								}
								?>
								<div class="m-form-item">
									<input type="radio" name="frequency" value="<?php echo $option['id']; ?>"<?php echo $checked; ?> id="frequencies-<?php echo $id_key; ?>">
									<label for="frequencies-<?php echo $id_key; ?>" class="a-frequency-option"><?php echo ucwords( $option['text'] ); ?></label>
								</div>
							<?php endforeach; ?>
						</div>
					<?php endif; ?>
				</div>
			</fieldset>
		</section>

		<div class="m-form-actions m-membership-form-actions">
			<button type="submit" name="give" class="a-button<?php echo $attributes['donate_class']; ?>"><?php echo $attributes['donate_text']; ?></button>
		</div>

	</form>

</section>
