<?php
/**
 * The template for the email sent to the claiming user when a partner offer is claimed
 *
 */

// formatting is done in the wysiwyg, and variable replacement is done in class-minnpost-membership-front-end.php
$msg = '';
$msg .= $attributes['body'];

echo $msg;
