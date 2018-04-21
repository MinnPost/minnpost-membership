<?php
/**
 * The template for displaying support pages
 *
 */
get_header(); ?>
<?php
global $minnpost_membership;
?>

	<div id="primary" class="m-layout-membership o-support">
		<main id="main" class="site-main" role="main">
			<header class="m-membership-intro">
				<h1 class="a-standalone-title"><?php echo esc_html__( 'MinnPost member benefits give you more good reasons to support great nonprofit journalism', 'minnpost-membership' ); ?></h1>
			</header>
			<div class="m-entry-content">
				<?php $use_member_levels = get_option( $minnpost_membership->option_prefix . 'use_member_levels', false ); ?>
				<?php if ( 1 === intval( $use_member_levels ) ) : ?>
					<form class="m-form m-form-membership m-form-membership-member-levels">
						<?php
						$all_member_levels = $minnpost_membership->member_levels->get_member_levels( '' );

						$show_flipped = isset( $_GET['level'] ) ? true : false;
						if ( true === $show_flipped ) {
							$default_member_level = 'member_' . filter_var( $_GET['level'], FILTER_SANITIZE_STRING );
						} else {
							$default_member_level = $minnpost_membership->member_levels->get_default_member_level();
						}
						if ( ! empty( $all_member_levels ) ) :
						?>
							<fieldset>
								<section class="o-membership-member-levels">
									<?php foreach ( $all_member_levels as $key => $record ) : ?>
										<?php
										$ranges     = $minnpost_membership->member_levels->calculate_ranges( $record );
										$is_active  = ( $record['slug'] === $default_member_level ) ? ' active' : '';
										$is_flipped = ( $record['slug'] === $default_member_level && true === $show_flipped ) ? ' flipped' : '';
										?>

										<article class="m-membership-member-level m-membership-member-level-<?php echo $record['slug']; ?> m-membership-member-level-<?php echo $key + 1; ?><?php echo $is_active; ?>">
											<section class="m-member-level-brief<?php echo $is_flipped; ?>">
												<h2><?php echo esc_html( $record['name'] ); ?></h2>
												<div class="amount">
													<h3 data-one-time="<?php echo $ranges['yearly']; ?>" data-year="<?php echo $ranges['yearly']; ?>" data-month="<?php echo $ranges['monthly']; ?>" data-default-monthly="<?php echo $ranges['default_monthly']; ?>" data-default-yearly="<?php echo $ranges['default_yearly']; ?>">
														<?php echo $ranges[ $minnpost_membership->member_levels->get_frequency_options( get_option( $minnpost_membership->option_prefix . 'default_frequency', '' ) )['id'] ]; ?>
													</h3>
													<?php $frequency_options = $minnpost_membership->member_levels->get_frequency_options(); ?>
													<?php if ( ! empty( $frequency_options ) ) : ?>
														<div class="m-form-item">
															<select id="membership-frequency-preview-<?php echo $key + 1; ?>" name="membership-frequency-preview-<?php echo $key + 1; ?>" class="a-form-item-membership-frequency" data-member-level-number="<?php echo $key + 1; ?>">
																<?php foreach ( $frequency_options as $option ) : ?>
																	<?php
																	if ( $minnpost_membership->member_levels->get_frequency_options( get_option( $minnpost_membership->option_prefix . 'default_frequency', '' ) )['value'] === $option['value'] ) {
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
													<a href="#" class="a-button a-button-flip"><?php echo __( 'Set Amount', 'minnpost-membership' ); ?></a>
												</div>
												<div class="enter">
													<h3><?php echo esc_html( '$' ); ?><div class="m-form-item">
															<input class="amount-entry" type="number" id="amount-level-<?php echo $key + 1; ?>" name="amount-level-<?php echo $key + 1; ?>" value="<?php echo $record['starting_value']; ?>" data-member-level-number="<?php echo $key + 1; ?>"<?php if ( '' !== $record['minimum_monthly_amount'] ) { ?> min="<?php echo $record['minimum_monthly_amount']; ?>"<?php } ?>>
														</div>
													</h3>
													<div class="m-form-item">
														<select id="membership-frequency-<?php echo $key + 1; ?>" name="membership-frequency-<?php echo $key + 1; ?>" class="a-form-item-membership-frequency" data-member-level-number="<?php echo $key + 1; ?>">
															<?php foreach ( $frequency_options as $option ) : ?>
																<?php
																if ( $minnpost_membership->member_levels->get_frequency_options( get_option( $minnpost_membership->option_prefix . 'default_frequency', '' ) )['value'] === $option['value'] ) {
																	$selected = ' selected';
																} else {
																	$selected = '';
																}
																?>
																<option value="<?php echo $option['value']; ?>"<?php echo $selected; ?>><?php echo $option['text']; ?></option>
															<?php endforeach; ?>
														</select>
													</div>
													<input class="a-button" name="membership-submit-<?php echo $key + 1; ?>" value="<?php echo __( 'Give Now', 'minnpost-membership' ); ?>" type="submit">
												</div>
											</section>
										</article>
									<?php endforeach; ?>
								</section>
							</fieldset>
						<?php endif; ?>
					</form>
				<?php endif; ?>
			</div>
		</main><!-- #main -->

	</div><!-- #primary -->

<?php
get_footer();
