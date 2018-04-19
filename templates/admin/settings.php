<div id="main">
	<form method="post" action="options.php">
		<?php
		if ( ! empty( $tabs ) && true === $this->pages[ $page ]['use_tabs'] ) {
			settings_fields( $tab ) . do_settings_sections( $tab );
		} else {
			settings_fields( $section ) . do_settings_sections( $section );
		}
		?>
		<?php submit_button( __( 'Save settings', 'minnpost-membership' ) ); ?>
	</form>
</div>
