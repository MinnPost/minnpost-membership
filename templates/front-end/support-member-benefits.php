<?php
/**
 * The template for displaying support pages
 *
 */
get_header(); ?>

	<div id="primary" class="m-layout-membership o-support"> <!-- container here is flex; need to figure out how to make this div take up 100% bc no columns -->
		<main id="main" class="site-main" role="main">
			<?php $use_member_levels = get_option( $this->option_prefix . 'use_member_levels', false ); ?>
			<?php if ( 1 === intval( $use_member_levels ) ) : ?>
				<section class="minnpost-membership-member-levels">
					<h3><?php echo esc_html__( 'Current member levels', 'minnpost-membership' ); ?></h3>
					<?php
					$all_member_levels = $this->member_levels->get_member_levels( '' );
					if ( ! empty( $all_member_levels ) ) :
					?>
						<?php foreach ( $all_member_levels as $key => $record ) : ?>
							<?php $ranges = $this->member_levels->calculate_ranges(); ?>
							<article class="minnpost-membership-member-level minnpost-membership-member-level-<?php echo $record['slug']; ?>">
								<header class="member-level-brief">
									<h4><?php echo esc_html( $record['name'] ); ?></h4>
									<?php if ( 1 !== intval( $record['is_nonmember'] ) ) : ?>
										<div class="amount">
											<?php if ( 1 === $record['minimum_monthly_amount'] ) : ?>
												<h5 data-one-time="" data-year="" data-month=""><?php echo html_entity_decode( '<' ) . html_entity_decode( '$' ) . ( $record['maximum_monthly_amount'] + 1 ); ?></h5>
											<?php elseif ( '' === $record['maximum_monthly_amount'] ) : ?>
												<h5><?php echo html_entity_decode( '$' ) . $record['minimum_monthly_amount'] . html_entity_decode( '+' ); ?></h5>
											<?php else : ?>
												<h5><?php echo html_entity_decode( '$' ) . $record['minimum_monthly_amount'] . html_entity_decode( '-' ) . $record['maximum_monthly_amount']; ?></h5>
											<?php endif; ?>
											<?php if ( '' !== get_option( $this->option_prefix . 'default_frequency', '' ) ) : ?>
												<p><?php echo $this->member_levels->get_frequency_options( get_option( $this->option_prefix . 'default_frequency', '' ) )['text']; ?></p>
											<?php endif; ?>
										</div>
									<?php endif; ?>
								</header>
							</article>
						<?php endforeach; ?>
					<?php endif; ?>
				</section>
			<?php endif; ?>
		</main><!-- #main -->

	</div><!-- #primary -->

<?php
get_footer();
