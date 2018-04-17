<?php
/**
 * The template for displaying support pages
 *
 */
get_header(); ?>

	<div id="primary" class="m-layout-membership o-support">
		<main id="main" class="site-main" role="main">
			<header class="m-membership-intro">
				<h1 class="a-standalone-title"><?php echo esc_html__( 'MinnPost member benefits give you more good reasons to support great nonprofit journalism', 'minnpost-membership' ); ?></h1>
			</header>
			<div class="m-entry-content">
				<?php $use_member_levels = get_option( $this->option_prefix . 'use_member_levels', false ); ?>
				<?php if ( 1 === intval( $use_member_levels ) ) : ?>
					<form class="m-form m-form-membership m-form-membership-member-levels">
						<?php
						$all_member_levels = $this->member_levels->get_member_levels( '' );
						if ( ! empty( $all_member_levels ) ) :
						?>
							<fieldset>
								<section class="o-membership-member-levels">
									<?php foreach ( $all_member_levels as $key => $record ) : ?>
										<?php $ranges = $this->member_levels->calculate_ranges( $record ); ?>
										<article class="m-membership-member-level m-membership-member-level-<?php echo $record['slug']; ?>">
											<section class="m-member-level-brief">
												<h2><?php echo esc_html( $record['name'] ); ?></h2>
												<div class="flipper">
													<div class="amount">
														<h3 data-one-time="<?php echo $ranges['yearly']; ?>" data-year="<?php echo $ranges['yearly']; ?>" data-month="<?php echo $ranges['monthly']; ?>">
															<?php echo $ranges[ $this->member_levels->get_frequency_options( get_option( $this->option_prefix . 'default_frequency', '' ) )['id'] ]; ?>
														</h3>
														<?php $frequency_options = $this->member_levels->get_frequency_options(); ?>
														<?php if ( ! empty( $frequency_options ) ) : ?>
															<div class="m-form-item">
																<select>
																	<?php foreach ( $frequency_options as $option ) : ?>
																		<?php
																		if ( $this->member_levels->get_frequency_options( get_option( $this->option_prefix . 'default_frequency', '' ) )['value'] === $option['value'] ) {
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
														<a href="#" class="a-button a-button-choose">Set Amount</a>
													</div>
													<div class="enter">
														what
													</div>
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
