<?php
/**
 * The template for displaying support pages
 *
 */
get_header( 'support' ); ?>
<?php
global $minnpost_membership;
$url_params = $minnpost_membership->front_end->process_membership_parameters( 'get' );
$user_id    = get_current_user_id();
?>

	<div id="primary" class="m-layout-membership o-support">

		<section class="m-support-progress" aria-label="progress">
			<ol>
				<?php $choose_url = site_url( '/support/' ); ?>
				<?php if ( ! empty( $url_params ) ) : ?>
						<?php $choose_url .= http_build_query( $url_params ); ?>
				<?php endif; ?>
				<li><a href="<?php echo $choose_url; ?>" class="active">Choose</a></li>
				<?php
				if ( ! empty( $url_params ) ) {
					$pay_url  = defined( 'PAYMENT_PROCESSOR_URL' ) ? PAYMENT_PROCESSOR_URL : get_option( $this->option_prefix . 'payment_processor_url', '' );
					$pay_url .= '&amp;' . http_build_query( $url_params );
				}
				?>
				<?php if ( isset( $pay_url ) ) : ?>
					<li><a href="<?php echo $pay_url; ?>"><?php echo __( 'Payment', 'minnpost-membership' ); ?></a></li>
				<?php else : ?>
					<li><span><?php echo __( 'Payment', 'minnpost-membership' ); ?></span></li>
				<?php endif; ?>
				<li><span><?php echo __( 'Thank You', 'minnpost-membership' ); ?></span></li>
			</ol>
		</section>

		<main id="main" class="site-main" role="main">

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
			<div class="m-entry-content">
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

				<form action="<?php echo admin_url( 'admin-ajax.php' ); ?>" method="post" class="m-form m-form-membership m-form-membership-support">
					<input type="hidden" name="action" value="donate_choose_form_submit">
					<input type="hidden" name="minnpost_membership_form_nonce" value="<?php echo wp_create_nonce( 'mem-form-nonce' ); ?>">
					<input type="hidden" name="current_url" value="<?php echo rtrim( parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ), '/' ); ?>">
					<?php if ( ! empty( $url_params ) ) : ?>
						<?php foreach ( $url_params as $key => $value ) : ?>
							<?php if ( 'amount' !== $key && 'frequency' !== $key ) : ?>
								<input type="hidden" name="<?php echo $key; ?>" value="<?php echo $value; ?>">
							<?php endif; ?>
						<?php endforeach; ?>
					<?php endif; ?>

					<?php if ( ! empty( $_GET['errors'] ) ) : ?>
						<div class="m-form-message m-form-message-error">
							<p><?php echo $minnpost_membership->front_end->get_result_message( $_GET['errors'] )['message']; ?></p>
						</div>
					<?php endif; ?>

					<section class="m-membership-choose-frequency">
						<h1>Choose Frequency</h1>
						<fieldset>
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
						</fieldset>
					</section>

					<section class="m-membership-choose-amount">
						<h1>Choose Amount</h1>
						<fieldset>
							<?php
							$suggested_amounts = $minnpost_membership->member_levels->get_suggested_amounts();

							if ( isset( $url_params['amount'] ) ) {
								$amount = $url_params['amount'];
							} elseif ( '' !== get_option( $minnpost_membership->option_prefix . 'support_start_value', '' ) ) {
								$amount = get_option( $minnpost_membership->option_prefix . 'support_start_value', '' );
							}
							$other_amount = $amount;
							?>

							<?php if ( ! empty( $suggested_amounts ) ) : ?>
							<div class="m-form-radios">
								<?php foreach ( $suggested_amounts as $key => $option ) : ?>
									<?php
									$id_key = $key + 1;
									$checked = '';
									if ( $amount === $option['amount'] ) {
										$other_amount = '';
										$checked = ' checked';
									}
									?>
									<div class="m-form-item">
										<input type="radio" name="amounts" value="<?php echo $option['amount'] ?>" id="amounts-<?php echo $id_key ?>" <?php echo $checked; ?>/>
										<label for="amounts-<?php echo $id_key; ?>" class="a-amount-option"><strong>$<?php echo $option['amount']; ?></strong> <?php echo $option['monthly_desc']; ?></label>
									</div>
								<?php endforeach; ?>
							</div>
							<?php endif; ?>

							<div class="m-form-item-wrap">
								<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_pre_form_text', '' ) ) : ?>
									<span class="a-fast-select-intro"><?php echo get_option( $minnpost_membership->option_prefix . 'support_pre_form_text', '' ); ?></span>
								<?php endif; ?>
								<span class="a-fast-select-currency">&dollar;</span>
								<div id="amount-item" class="a-amount-field">
									<input id="amount" min="1" name="amount" value="<?php echo $other_amount; ?>" type="number">
								</div>
							</div>
						</fieldset>
					</section>

					<div class="m-form-actions m-membership-form-actions">
						<button type="submit" name="give" class="a-button"><?php echo get_option( $minnpost_membership->option_prefix . 'support_button_text', '' ); ?></button>
						<?php $minnpost_membership->front_end->link_next_to_button( 'support' ); ?>
					</div>

					<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_post_body', '' ) ) : ?>
						<?php echo get_option( $minnpost_membership->option_prefix . 'support_post_body', '' ); ?>
					<?php endif; ?>
				</form>

				<?php $minnpost_membership->front_end->post_body_text_link( 'support' ); ?>

				<aside>
					<?php
					if ( '' !== get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_link_from_other_pages', '' ) && '' !== get_option( $minnpost_membership->option_prefix . 'support_post_body_show_member_details_link', '' ) ) {
						echo sprintf( '<p class="member-benefit-details-link">%1$s</p>',
							get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_link_from_other_pages' )
						);
					}
					?>
				</aside>

			</div>
		</main><!-- #main -->

	</div><!-- #primary -->

<?php
get_footer( 'support' );
