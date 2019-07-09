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
	global $minnpost_membership;
	$url_params = $minnpost_membership->front_end->process_membership_parameters( 'get' );
	$user_id    = get_current_user_id();
	?>
			<?php if ( ! isset( $url_params['campaign'] ) || '' === get_option( $minnpost_membership->option_prefix . 'support_title_' . $url_params['campaign'], '' ) ) : ?>
				<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_title', '' ) ) : ?>
					<header class="m-membership-intro m-membership-support-intro">
						<h1 class="a-standalone-title"><?php echo get_option( $minnpost_membership->option_prefix . 'support_title', '' ); ?></h1>
					</header>
				<?php endif; ?>
			<?php else : ?>
				<header class="m-membership-intro m-membership-intro-campaign-<?php echo $url_params['campaign']; ?> m-membership-support-intro">
					<h1 class="a-standalone-title"><?php echo get_option( $minnpost_membership->option_prefix . 'support_title_' . $url_params['campaign'], '' ); ?></h1>
				</header>
			<?php endif; ?>
				<form action="<?php echo admin_url( 'admin-ajax.php' ); ?>" method="post" class="m-form m-form-membership m-form-membership-support">
					<input type="hidden" name="action" value="membership_form_submit">
					<input type="hidden" name="minnpost_membership_form_nonce" value="<?php echo wp_create_nonce( 'mem-form-nonce' ); ?>">
					<input type="hidden" name="current_url" value="<?php echo rtrim( parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ), '/' ); ?>">
					<?php if ( ! empty( $url_params ) ) : ?>
						<?php foreach ( $url_params as $key => $value ) : ?>
							<?php if ( 'amount' !== $key && 'frequency' !== $key ) : ?>
								<input type="hidden" name="<?php echo $key; ?>" value="<?php echo $value; ?>">
							<?php endif; ?>
						<?php endforeach; ?>
					<?php endif; ?>

					<?php if ( ! isset( $url_params['campaign'] ) || '' === get_option( $minnpost_membership->option_prefix . 'support_summary_' . $url_params['campaign'], '' ) ) : ?>
						<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_summary', '' ) ) : ?>
							<section class="m-membership-summary">
								<?php echo wpautop( get_option( $minnpost_membership->option_prefix . 'support_summary', '' ) ); ?>
							</section>
						<?php endif; ?>
					<?php else : ?>
						<section class="m-membership-summary-campaign-<?php echo $url_params['campaign']; ?>">
							<?php echo wpautop( get_option( $minnpost_membership->option_prefix . 'support_summary_' . $url_params['campaign'], '' ) ); ?>
						</section>
					<?php endif; ?>

					<?php if ( ! empty( $_GET['errors'] ) ) : ?>
						<div class="m-form-message m-form-message-error">
							<p><?php echo $minnpost_membership->front_end->get_result_message( $_GET['errors'] )['message']; ?></p>
						</div>
					<?php endif; ?>

					<section class="m-membership-fast-select">
						<fieldset>
							<div class="m-form-item-wrap">
								<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_pre_form_text', '' ) ) : ?>
									<span class="a-fast-select-intro"><?php echo get_option( $minnpost_membership->option_prefix . 'support_pre_form_text', '' ); ?></span>
								<?php endif; ?>
								<span class="a-fast-select-currency">&dollar;</span>
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
											$frequency_values = $minnpost_membership->member_levels->get_frequency_values( $option['value'] );
											?>
											<div class="m-form-item">
												<input type="radio" name="frequencies" value="<?php echo $option['value']; ?>"<?php echo $checked; ?> data-year-frequency="<?php echo $frequency_values['times_per_year']; ?>" id="frequencies-<?php echo $id_key; ?>">
												<label for="frequencies-<?php echo $id_key; ?>"  class="a-frequency-option"><?php echo ucwords( $option['text'] ); ?></label>
											</div>
										<?php endforeach; ?>
									</div>
								<?php endif; ?>
							</div>
						</fieldset>
					</section>

					<div class="m-form-actions m-membership-form-actions">
						<button type="submit" name="give" class="a-button"><?php echo get_option( $minnpost_membership->option_prefix . 'support_button_text', '' ); ?></button>
					</div>

				</form>

</section>
