<div id="main">
	<form method="post" action="options.php">
		<?php
		if ( ! empty( $tabs ) && true === $this->pages[ $page ]['use_tabs'] ) {
			settings_fields( $tab ) . do_settings_sections( $tab );
		} else {
			foreach ( $sections as $key => $value ) {
				settings_fields( $key );
			}
			do_settings_sections( $page );
		}
		?>
		<?php submit_button( __( 'Save settings', 'minnpost-membership' ) ); ?>
	</form>
</div>
