<?php
/**
 * The template for displaying support pages
 *
 */
get_header( 'support' ); ?>
<?php
$minnpost_membership = minnpost_membership();
?>

	<div id="primary" class="m-layout-membership o-support">
		<main id="main" class="site-main" role="main">
			<header class="m-membership-intro">
				<h1 class="a-standalone-title"><?php echo get_option( $minnpost_membership->option_prefix . 'support-member-benefits_title', '' ); ?></h1>
			</header>
			<div class="m-entry-content">

				<?php
				$intro = get_option( $minnpost_membership->option_prefix . 'support-member-benefits_pre_form_text', '' );
				if ( '' !== $intro ) {
					echo '<div class="m-membership-pre-form">' . $intro . '</div>';
				}
				?>

				<?php $use_member_levels = get_option( $minnpost_membership->option_prefix . 'use_member_levels', false ); ?>
				<?php if ( 1 === intval( $use_member_levels ) ) : ?>
					<form action="<?php echo admin_url( 'admin-ajax.php' ); ?>" method="post" class="m-form m-form-membership m-form-membership-member-levels">
						<input type="hidden" name="action" value="benefit_choose_form_submit">
						<input type="hidden" name="minnpost_membership_form_nonce" value="<?php echo wp_create_nonce( 'mem-form-nonce' ); ?>">
						<input type="hidden" name="current_url" value="<?php echo rtrim( parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH ), '/' ); ?>">
						<?php $url_params = $minnpost_membership->front_end->process_membership_parameters( 'get' ); ?>
						<?php if ( ! empty( $url_params ) ) : ?>
							<?php foreach ( $url_params as $key => $value ) : ?>
								<?php if ( 'amount' !== $key && 'frequency' !== $key ) : ?>
									<input type="hidden" name="<?php echo $key; ?>" value="<?php echo $value; ?>">
								<?php endif; ?>
							<?php endforeach; ?>
						<?php endif; ?>
						<?php
						$all_member_levels = $minnpost_membership->member_levels->get_member_levels( '' );

						if ( isset( $url_params['amount'] ) ) {
							$url_frequency        = isset( $url_params['frequency'] ) ? $url_params['frequency'] : '';
							$show_flipped         = true;
							$default_member_level = $minnpost_membership->member_levels->calculate_level( $url_params['amount'], $url_frequency );
						} else {
							$show_flipped = isset( $_GET['level'] ) ? true : false;
							if ( true === $show_flipped ) {
								$default_member_level = 'member_' . filter_var( $_GET['level'], FILTER_SANITIZE_STRING );
							} else {
								$default_member_level = $minnpost_membership->member_levels->get_default_member_level();
							}
						}
						if ( ! empty( $all_member_levels ) ) :
						?>
							<fieldset id="choose-member-level">
								<section class="o-membership-member-levels">
									<?php if ( ! empty( $_GET['errors'] ) ) : ?>
									<div class="m-form-message m-form-message-error">
										<p><?php echo $minnpost_membership->front_end->get_result_message( $_GET['errors'] )['message']; ?></p>
									</div>
								<?php endif; ?>
									<?php foreach ( $all_member_levels as $key => $record ) : ?>
										<?php
										$ranges     = $minnpost_membership->member_levels->calculate_ranges( $record );
										$is_active  = ( $record['slug'] === $default_member_level ) ? ' active' : '';
										$is_flipped = ( $record['slug'] === $default_member_level && true === $show_flipped ) ? ' flipped' : '';
										?>

										<article class="m-membership-member-level m-membership-member-level-<?php echo $record['slug']; ?> m-membership-member-level-<?php echo $key + 1; ?><?php echo $is_active; ?>">
											<section class="m-member-level-brief<?php echo $is_flipped; ?>">
												<h2><?php echo esc_html( $record['name'] ); ?></h2>
												<?php
												if ( ! isset( $url_frequency ) || '' === $url_frequency ) {
													$default_frequency = get_option( $minnpost_membership->option_prefix . 'default_frequency', '' )[0];
													$default_amount    = $record['starting_value'];
												} else {
													$default_frequency = $minnpost_membership->member_levels->get_frequency_options( $url_frequency, 'id' )['value'];
													$frequency_values  = $minnpost_membership->member_levels->get_frequency_values( $default_frequency );
													if ( $record['slug'] === $default_member_level ) {
														if ( 'month' !== $frequency_values['frequency_name'] ) {
															$default_amount = $url_params['amount'] * $frequency_values['times_per_year'];
														} else {
															$default_amount = $url_params['amount'];
														}
													} else {
														$default_amount    = $record['starting_value'];
													}
												}
												?>
												<div class="amount">
													<h3 data-one-time="<?php echo $ranges['yearly']; ?>" data-year="<?php echo $ranges['yearly']; ?>" data-month="<?php echo $ranges['monthly']; ?>" data-default-monthly="<?php echo $ranges['default_monthly']; ?>" data-default-yearly="<?php echo $ranges['default_yearly']; ?>">
														<?php
														$current_frequency = $minnpost_membership->member_levels->get_frequency_options( $default_frequency );
														echo $ranges[ $current_frequency['id'] ];
														?>
													</h3>
													<?php $frequency_options = $minnpost_membership->member_levels->get_frequency_options(); ?>
													<?php if ( ! empty( $frequency_options ) ) : ?>
														<div class="m-form-item">
															<select id="membership-frequency-preview-<?php echo $key + 1; ?>" name="membership-frequency-preview-<?php echo $key + 1; ?>" class="a-form-item-membership-frequency" data-member-level-number="<?php echo $key + 1; ?>">
																<?php foreach ( $frequency_options as $option ) : ?>
																	<?php
																	if ( $default_frequency === $option['value'] ) {
																		$selected = ' selected';
																	} else {
																		$selected = '';
																	}
																	?>
																	<option value="<?php echo $option['value']; ?>"<?php echo $selected; ?>><?php echo $option['text']; ?></option>
																<?php endforeach; ?>
															</select>
														</div>
													<?php endif; ?>
													<a href="#" class="a-button a-button-flip"><?php echo get_option( $minnpost_membership->option_prefix . 'support-member-benefits_level_button_text', '' ); ?></a>
												</div>
												<div class="enter">
													<h3><?php echo esc_html( '$' ); ?><div class="m-form-item">
															<input class="amount-entry" type="number" id="amount-level-<?php echo $key + 1; ?>" name="amount-level-<?php echo $key + 1; ?>" value="<?php echo $default_amount; ?>" data-member-level-number="<?php echo $key + 1; ?>"<?php if ( '' !== $record['minimum_monthly_amount'] ) { ?> min="<?php echo $record['minimum_monthly_amount']; ?>"<?php } ?>>
														</div>
													</h3>
													<div class="m-form-item">
														<select id="membership-frequency-<?php echo $key + 1; ?>" name="membership-frequency-<?php echo $key + 1; ?>" class="a-form-item-membership-frequency" data-member-level-number="<?php echo $key + 1; ?>">
															<?php foreach ( $frequency_options as $option ) : ?>
																<?php
																if ( $default_frequency === $option['value'] ) {
																		$selected = ' selected';
																} else {
																	$selected = '';
																}
																?>
																<option value="<?php echo $option['value']; ?>"<?php echo $selected; ?>><?php echo $option['text']; ?></option>
															<?php endforeach; ?>
														</select>
													</div>
													<input class="a-button" name="membership-submit-<?php echo $key + 1; ?>" value="<?php echo get_option( $minnpost_membership->option_prefix . 'support-member-benefits_give_button_text', '' ); ?>" type="submit">
												</div>
											</section>
											<section class="m-member-level-benefits">
												<?php echo wpautop( $record['benefits'] ); ?>
											</section>
										</article>
									<?php endforeach; ?>
								</section>
							</fieldset>
						<?php endif; ?>

						<?php $minnpost_membership->front_end->post_body_text_link( 'support-member-benefits' ); ?>

						<aside>
							<?php
							if ( '' !== get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_link_from_other_pages', '' ) && '' !== get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_link_from_other_pages', '' ) ) {
								echo sprintf( '<p class="member-benefit-details-link">%1$s</p>',
									get_option( $minnpost_membership->option_prefix . 'support-member-benefit-details_link_from_other_pages' )
								);
							}
							?>
						</aside>
					</form>
				<?php endif; ?>
			</div>
		</main><!-- #main -->

	</div><!-- #primary -->

<?php
get_footer( 'support' );
