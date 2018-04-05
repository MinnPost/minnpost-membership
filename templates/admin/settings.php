<div id="main">
	<form method="post" action="options.php">
		<?php
		settings_fields( $section ) . do_settings_sections( $section );
		?>
		<?php submit_button( __( 'Save settings', 'minnpost-membership' ) ); ?>
	</form>
</div>
