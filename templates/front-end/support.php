<?php
/**
 * The template for displaying support pages
 *
 */
get_header( 'support' ); ?>
<?php
$minnpost_membership = minnpost_membership();
$url_params          = $minnpost_membership->front_end->process_membership_parameters( 'get' );
$user_id             = get_current_user_id();
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
					$pay_url = defined( 'PAYMENT_PROCESSOR_URL' ) ? PAYMENT_PROCESSOR_URL : get_option( $this->option_prefix . 'payment_processor_url', '' );
					if ( strstr( $pay_url, '?' ) ) {
						$character = '&amp;';
					} else {
						$character = '?';
					}
					$pay_url .= $character . http_build_query( $url_params );
					// this url needs to update with the javascript.
				}
				?>
				<?php if ( isset( $pay_url ) ) : ?>
					<li class="a-pay-url"><a href="<?php echo $pay_url; ?>"><?php echo __( 'Payment', 'minnpost-membership' ); ?></a></li>
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

			<div class="m-entry-content m-membership-support-wrapper">
				<?php if ( ! isset( $url_params['campaign'] ) || '' === get_option( $minnpost_membership->option_prefix . 'support_summary_' . $url_params['campaign'], '' ) ) : ?>
					<?php
						$summary         = get_option( $minnpost_membership->option_prefix . 'support_summary', '' );
						$compact_summary = get_option( $minnpost_membership->option_prefix . 'support_summary_compact', $summary );
					?>
					<?php if ( '' !== $summary ) : ?>
						<section class="m-membership-summary">
							<?php echo wpautop( $summary ); ?>
						</section>
					<?php endif; ?>

					<?php if ( '' !== $compact_summary ) : ?>
						<section class="m-membership-summary-short">
							<?php echo wpautop( $compact_summary ); ?>
						</section>
					<?php endif; ?>
				<?php else : ?>
					<?php
						$summary         = get_option( $minnpost_membership->option_prefix . 'support_summary_' . $url_params['campaign'], '' );
						$compact_summary = get_option( $minnpost_membership->option_prefix . 'support_summary_' . $url_params['campaign'] . '_compact', $summary );
					?>
					<section class="m-membership-summary m-membership-summary-campaign-<?php echo $url_params['campaign']; ?>">
						<?php echo wpautop( $summary ); ?>
					</section>

					<?php if ( '' !== $compact_summary ) : ?>
						<section class="m-membership-summary-short m-membership-summary-campaign-<?php echo $url_params['campaign']; ?>-short">
							<?php echo wpautop( $compact_summary ); ?>
						</section>
					<?php endif; ?>
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

					<section class="m-membership-choose-frequency m-membership-choice-group">
						<h2 class="a-membership-choose"><?php echo __( 'Choose Frequency', 'minnpost-membership' ); ?></h2>
						<fieldset>
							<?php
							$frequency_options = $minnpost_membership->member_levels->get_frequency_options();
							?>
							<?php if ( ! empty( $frequency_options ) ) : ?>
								<div class="m-form-radios m-frequency-select">
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
										$frequency_values       = $minnpost_membership->member_levels->get_frequency_values( $option['value'] );
										$frequency_text_label   = $minnpost_membership->member_levels->get_frequency_text_label( $frequency, 'value' );
										$frequency_button_label = $minnpost_membership->member_levels->get_frequency_button_label( $option['text'], $option['text'] );
										?>
										<div class="m-form-item">
											<input type="radio" name="frequencies" value="<?php echo $option['value']; ?>"<?php echo $checked; ?> data-year-frequency="<?php echo $frequency_values['times_per_year']; ?>" data-frequency-text-label="<?php echo $frequency_text_label; ?>" id="frequencies-<?php echo $id_key; ?>">
											<label for="frequencies-<?php echo $id_key; ?>" class="a-frequency-option"><?php echo $frequency_button_label; ?></label>
										</div>
									<?php endforeach; ?>
								</div>
							<?php endif; ?>
						</fieldset>
					</section>

					<section class="m-membership-choose-amount m-membership-choice-group">
						<h2 class="a-membership-choose"><?php echo __( 'Choose Amount', 'minnpost-membership' ); ?></h2>
						<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_pre_suggested_amounts_text', '' ) ) : ?>
						<p class="a-suggested-amounts-intro"><?php echo get_option( $minnpost_membership->option_prefix . 'support_pre_suggested_amounts_text', '' ); ?></p>
						<?php endif; ?>
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
							<div class="m-form-radios m-amount-select">
								<?php foreach ( $suggested_amounts as $freq_id => $amounts ) : ?>
									<?php $freq_value = $minnpost_membership->member_levels->get_frequency_options( $freq_id, 'id' )['value']; ?>
									<div class="m-frequency-group<?php echo ( $freq_value === $frequency ) ? ' active' : ''; ?>" data-frequency="<?php echo $freq_value; ?>">
									<?php foreach ( $amounts as $key => $option ) : ?>
										<?php
										$id_key           = $freq_id . '-' . ( $key + 1 );
										$suggested_amount = $option['amount'];
										$checked          = '';
										if ( $freq_value === $frequency && (int) $amount === (int) $suggested_amount ) {
											$other_amount = '';
											$checked      = ' checked';
										}
										$text_label = $minnpost_membership->member_levels->get_frequency_text_label( $freq_id );
										?>
										<div class="m-form-item">
											<input type="radio" name="amounts" value="<?php echo $option['amount']; ?>" id="amounts-<?php echo $id_key; ?>" data-index="<?php echo $key + 1; ?>" <?php echo $checked; ?>>
											<label for="amounts-<?php echo $id_key; ?>"
												class="a-amount-option"
												data-amount="<?php echo $option['amount']; ?>"
												data-desc="<?php echo $option['desc']; ?>">
												<strong>$<?php echo $option['amount']; ?><span class="a-frequency-text-label"><?php echo $text_label; ?></span></strong>
												<span class="a-amount-description"><?php echo $option['desc']; ?></span>
											</label>
										</div>
									<?php endforeach; ?>
								</div>
								<?php endforeach; ?>
							</div>
							<?php endif; ?>

							<div class="m-form-item-wrap">
								<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'support_pre_form_text', '' ) ) : ?>
									<label for="amount" class="a-fast-select-intro"><?php echo get_option( $minnpost_membership->option_prefix . 'support_pre_form_text', '' ); ?></label>
								<?php endif; ?>
								<div id="amount-item" class="a-amount-field">
									<span class="a-fast-select-currency">&dollar;</span>
									<input id="amount" min="1" name="amount" value="<?php echo $other_amount; ?>" type="number"><span class="a-frequency-text-label"><?php echo $frequency_text_label; ?></span>
								</div>
							</div>
						</fieldset>
					</section>

					<section class="m-membership-choose-gift m-membership-choice-group">
						<h2 class="a-membership-choose"><?php echo __( 'Select Thank You Gift', 'minnpost-membership' ); ?></h2>
						<fieldset>
							<div class="m-form-radios m-decline-benefits-select">
								<div class="m-form-item">
									<input type="radio" name="decline_benefits" value="false" id="decline-benefits-n">
									<label for="decline-benefits-n" class="a-decline-benefits-option"><?php echo __( 'Choose thank you&nbsp;gift', 'minnpost-membership' ); ?></label>
								</div>
								<div class="m-form-item">
									<input type="radio" name="decline_benefits" value="true" checked id="decline-benefits-y">
									<label for="decline-benefits-y" class="a-decline-benefits-option"><?php echo __( 'Decline gift and give entire amount to MinnPost', 'minnpost-membership' ); ?></label>
								</div>
							</div>
						</fieldset>

						<div class="m-membership-gift-selector m-membership-choice-group">

							<?php
							$on_page_frequency    = $minnpost_membership->member_levels->get_frequency_options( $frequency, 'value' );
							$new_amount_this_year = $minnpost_membership->user_info->get_user_new_amount( $user_id, $amount, $on_page_frequency );
							$minnpost_membership->front_end->post_form_text( $amount, $on_page_frequency, $new_amount_this_year, $user_id );
							$frequency_values = $minnpost_membership->member_levels->get_frequency_values( $frequency );
							$yearly_amount    = $amount * $frequency_values['times_per_year'];

							// minimum level for swag is silver.
							// todo: probably wise to put this as a setting somewhere.
							$min_swag_level         = $minnpost_membership->member_levels->get_member_levels( 'member_silver', false, 'slug' );
							$swag_min_yearly_amount = $min_swag_level['minimum_monthly_amount'] * 12;
							$swag_disabled          = $yearly_amount < $swag_min_yearly_amount ? true : false;

							$all_gift_levels = new WP_Query(
								array(
									'post_type' => 'thank_you_gift',
									'meta_key'  => '_mp_thank_you_gift_minimum_member_level_id',
									'orderby'   => 'meta_value_num',
									'order'     => 'ASC',
								)
							);
							$amount_levels   = array();
							?>

							<?php if ( $all_gift_levels->have_posts() ) : ?>

								<?php while ( $all_gift_levels->have_posts() ) : ?>
									<?php
									$all_gift_levels->the_post();
									$gift_level_meta = get_post_meta( get_the_ID() );
									$gift_level      = $gift_level_meta['_mp_thank_you_gift_minimum_member_level_id'][0];
									$gift_type       = $gift_level_meta['_mp_thank_you_gift_type'][0];
									$gift_label      = $minnpost_membership->front_end->get_thank_you_gift_description( get_the_ID() );
									if ( ! array_key_exists( $gift_level, $amount_levels ) ) {
										$amount_levels[ $gift_level ] = array(
											'level' => $gift_level,
											'types' => array(),
											'label' => $gift_label,
										);
									}
									if ( ! in_array( $gift_type, $amount_levels[ $gift_level ]['types'], true ) ) {
										$amount_levels[ $gift_level ]['types'][] = $gift_type;
									}
									if ( $gift_label !== $amount_levels[ $gift_level ]['label'] ) {
										$amount_levels[ $gift_level ]['label'] = $gift_label;
									}
									?>
								<?php endwhile; ?>

								<?php foreach ( $amount_levels as $key => $amount_level ) : ?>
									<?php
									$gifts = new WP_Query(
										array(
											'post_type'  => 'thank_you_gift',
											'meta_key'   => '_mp_thank_you_gift_minimum_member_level_id',
											'meta_value' => $amount_level['level'],
											'orderby'    => 'meta_value_num',
											'order'      => 'ASC',
										)
									);
									echo '<p>' . wp_kses_post( $amount_level['label'] ) . '</p>';
									?>
									<?php if ( $gifts->have_posts() ) : ?>
										<div class="m-form-radios m-gift-level m-select-<?php echo esc_attr( $amount_level['level'] ); ?> m-select-<?php echo esc_attr( implode( '-', $amount_level['types'] ) ); ?>">
											<?php while ( $gifts->have_posts() ) : ?>
												<?php
												$gifts->the_post();
												$slug = get_post()->post_name;
												$meta = get_post_meta( get_the_ID() );

												// what do we know about this gift?
												$gift_type  = $meta['_mp_thank_you_gift_type'][0];
												$gift_value = $slug;
												$radio_name = $gift_type;
												$radio_name = 'level-' . $amount_level['level'] . '-gift';

												// does the gift have options for user to pick from?
												$gift_option_name        = isset( $meta['_mp_thank_you_gift_option_name'][0] ) ? $meta['_mp_thank_you_gift_option_name'][0] : '';
												$gift_option_values      = isset( $meta['_mp_thank_you_gift_option_values'][0] ) ? preg_split( '~\R~', $meta['_mp_thank_you_gift_option_values'][0] ) : array();
												$gift_option_multiselect = isset( $meta['_mp_thank_you_gift_option_multiselect'][0] ) ? filter_var( $meta['_mp_thank_you_gift_option_multiselect'][0], FILTER_VALIDATE_BOOLEAN ) : '';
												$gift_option_type        = 'select';
												if ( true === $gift_option_multiselect ) {
													$gift_option_type = 'checkboxes';
												}

												// eligibility stuff.
												$level             = $minnpost_membership->member_levels->get_member_levels( $meta['_mp_thank_you_gift_minimum_member_level_id'][0] );
												$min_yearly_amount = $level['minimum_monthly_amount'] * 12;
												$disabled          = $yearly_amount < $min_yearly_amount ? ' disabled' : '';

												// image for the gift.
												$image_url        = isset( $meta['_mp_thank_you_gift_image'][0] ) ? $meta['_mp_thank_you_gift_image'][0] : '';
												$image_id         = isset( $meta['_mp_thank_you_gift_image_id'][0] ) ? $meta['_mp_thank_you_gift_image_id'][0] : '';
												$size             = 'full';
												$alt_text         = '';
												$text_after_image = isset( $meta['_mp_thank_you_gift_text_after_image'][0] ) ? $meta['_mp_thank_you_gift_text_after_image'][0] : '';
												if ( '' === $image_url && '' !== wp_get_attachment_image( $image_id, $size ) ) {
													$alt_text  = get_post_meta( $image_id, '_wp_attachment_image_alt', true );
													$image_url = wp_get_attachment_url( $image_id );
												}
												?>

												<div class="m-form-item">
													<input type="radio" name="<?php echo esc_attr( $radio_name ); ?>" id="<?php echo esc_attr( $gift_type ) . '-' . esc_attr( $slug ); ?>" value="<?php echo esc_attr( $gift_value ); ?>" data-min-monthly-amount="<?php echo esc_attr( $level['minimum_monthly_amount'] ); ?>" data-min-yearly-amount="<?php echo esc_attr( $min_yearly_amount ); ?>" <?php echo esc_attr( $disabled ); ?>>
													<label for="<?php echo esc_attr( $gift_type ) . '-' . esc_attr( $slug ); ?>" class="a-<?php echo esc_attr( $gift_type ); ?>-option">
														<?php if ( '' !== $image_url ) : ?>
															<figure class="m-thank-you-gift-image">
																<img src="<?php echo esc_url_raw( $image_url ); ?>?w=150" alt="<?php echo esc_html( $alt_text ); ?>" loading="lazy">
																<?php if ( '' !== $text_after_image ) : ?>
																	<figcaption><?php echo wp_kses_post( $text_after_image ); ?></figcaption>
																<?php endif; ?>
															</figure>
														<?php else : ?>
															<?php echo esc_html( get_the_title() ); ?>
														<?php endif; ?>
														<?php if ( '' !== $gift_option_name && ! empty( $gift_option_values ) ) : ?>
															<?php if ( 'select' === $gift_option_type ) : ?>
																<select class="a-gift-option-select" name="<?php echo esc_attr( $radio_name ); ?>-gift-option" data-required="true">
																	<?php foreach ( $gift_option_values as $option_value ) : ?>
																		<?php
																		$option_value = explode( '|', $option_value );
																		$value        = ( '' !== $option_value[0] ) ? esc_attr( sanitize_title( $gift_option_name ) ) . '_' . $option_value[0] : '';
																		$label        = isset( $option_value[1] ) ? $option_value[1] : $value;
																		?>
																		<option value="<?php echo esc_attr( $value ); ?>"><?php echo esc_attr( $label ); ?></option>
																	<?php endforeach; ?>
																</select>
															<?php endif; ?>
														<?php endif; ?>
														<div class="support-tooltip">
															<span class="dashicons dashicons-editor-help"></span>
															<div class="tooltip-text">
																<?php $minnpost_membership->front_end->support_tooltip_text( $level, $frequency ); ?>
															</div>
														</div>
													</label>
												</div>
											<?php endwhile; ?>

											<div class="m-form-item m-decline-level">
												<input type="radio" name="<?php echo esc_attr( $radio_name ); ?>" id="<?php echo esc_attr( $radio_name ); ?>-decline" value="">
												<label for="<?php echo esc_attr( $radio_name ); ?>-decline" class="a-<?php echo esc_attr( $radio_name ); ?>-option"><?php echo __( 'Decline gift', 'minnpost-membership' ); ?></label>
											</div>

										</div>

									<?php endif; ?>
								<?php endforeach; ?>
							<?php endif; ?>
						</div>
					</section>

					<div class="m-form-actions m-membership-form-actions">
						<button type="submit" name="give" class="a-button"><?php echo esc_html( get_option( $minnpost_membership->option_prefix . 'support_button_text', '' ) ); ?></button>
					</div>
				</form>

				<?php echo wp_kses_post( get_option( $minnpost_membership->option_prefix . 'support_post_body', '' ) ); ?>

				<?php $minnpost_membership->front_end->post_body_text_link( 'support' ); ?>

				<?php if ( '' !== get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_link_from_other_pages', '' ) && '' !== get_option( $minnpost_membership->option_prefix . 'support_post_body_show_member_details_link', '' ) ) : ?>
				<aside>
					<?php
					echo sprintf(
						'<p class="member-benefit-details-link">%1$s</p>',
						wp_kses_post( get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_link_from_other_pages' ) )
					);
					?>
				</aside>
				<?php endif; ?>

			</div>
		</main><!-- #main -->

	</div><!-- #primary -->

<?php
get_footer( 'support' );
