<?php
/**
 * Class file for the MinnPost_Membership_Content_Items class.
 *
 * @file
 */

if ( ! class_exists( 'MinnPost_Membership' ) ) {
	die();
}

/**
 * Create default structure for content items
 */
class MinnPost_Membership_Content_Items {

	public $option_prefix;
	public $file;
	public $version;
	public $slug;
	public $member_levels;
	public $user_info;
	public $cache;

	/**
	 * Constructor which sets up content items
	 */
	public function __construct() {

		$this->option_prefix = minnpost_membership()->option_prefix;
		$this->file          = minnpost_membership()->file;
		$this->version       = minnpost_membership()->version;
		$this->slug          = minnpost_membership()->slug;
		$this->member_levels = minnpost_membership()->member_levels;
		$this->user_info     = minnpost_membership()->user_info;
		$this->cache         = minnpost_membership()->cache;

		$this->mp_mem_transients = $this->cache->mp_mem_transients;

		$this->add_actions();

	}

	/**
	 * Create the action hooks to create content items
	 */
	public function add_actions() {
		add_action( 'init', array( $this, 'create_thank_you_gift' ), 0 );
		add_action( 'init', array( $this, 'create_partner' ), 0 );
		add_action( 'init', array( $this, 'create_partner_offer' ), 0 );
		add_action( 'admin_menu', array( $this, 'create_sub_menus' ), 20 );
		add_filter( 'enter_title_here', array( $this, 'title_placeholders' ), 10, 1 );
		add_action( 'cmb2_admin_init', array( $this, 'create_thank_you_gift_fields' ) );
		add_action( 'cmb2_admin_init', array( $this, 'create_partner_fields' ) );
		add_action( 'admin_menu', array( $this, 'remove_partner_offer_fields' ) );
		add_action( 'cmb2_admin_init', array( $this, 'create_partner_offer_fields' ) );
		add_filter( 'pre_get_posts', array( $this, 'membership_content_default_order' ), 10, 1 );
		add_filter( 'parent_file', array( $this, 'set_parent_menu' ), 10, 1 );
	}

	/**
	 * Create the thank-you gift content type
	 */
	public function create_thank_you_gift() {
		$labels = array(
			'name'                  => _x( 'Thank-you Gifts', 'Post Type General Name', 'minnpost-membership' ),
			'singular_name'         => _x( 'Thank-you Gift', 'Post Type Singular Name', 'minnpost-membership' ),
			'menu_name'             => __( 'Thank-you Gifts', 'minnpost-membership' ),
			'name_admin_bar'        => __( 'Thank-you Gift', 'minnpost-membership' ),
			'attributes'            => __( 'Thank-you Gift Attributes', 'minnpost-membership' ),
			'all_items'             => __( 'All Thank-you Gifts', 'minnpost-membership' ),
			'add_new_item'          => __( 'Add New Thank-you Gift', 'minnpost-membership' ),
			'add_new'               => __( 'Add New', 'minnpost-membership' ),
			'new_item'              => __( 'New Thank-you Gift', 'minnpost-membership' ),
			'edit_item'             => __( 'Edit Thank-you Gift', 'minnpost-membership' ),
			'update_item'           => __( 'Update Thank-you Gift', 'minnpost-membership' ),
			'view_item'             => __( 'View Thank-you Gift', 'minnpost-membership' ),
			'view_items'            => __( 'View Thank-you Gifts', 'minnpost-membership' ),
			'search_items'          => __( 'Search Thank-you Gift', 'minnpost-membership' ),
			'not_found'             => __( 'Not found', 'minnpost-membership' ),
			'not_found_in_trash'    => __( 'Not found in Trash', 'minnpost-membership' ),
			'featured_image'        => __( 'Featured Image', 'minnpost-membership' ),
			'set_featured_image'    => __( 'Set featured image', 'minnpost-membership' ),
			'remove_featured_image' => __( 'Remove featured image', 'minnpost-membership' ),
			'use_featured_image'    => __( 'Use as featured image', 'minnpost-membership' ),
			'insert_into_item'      => __( 'Insert into thank-you gift', 'minnpost-membership' ),
			'uploaded_to_this_item' => __( 'Uploaded to this thank-you gift', 'minnpost-membership' ),
			'items_list'            => __( 'Thank-you gifts list', 'minnpost-membership' ),
			'items_list_navigation' => __( 'Thank-you gifts list navigation', 'minnpost-membership' ),
			'filter_items_list'     => __( 'Filter thank-you gifts list', 'minnpost-membership' ),
		);
		$args   = array(
			'label'               => __( 'Thank-you gift', 'minnpost-membership' ),
			'description'         => __( 'Thank-you gifts for members', 'minnpost-membership' ),
			'labels'              => $labels,
			'supports'            => array( 'title', 'revisions' ),
			'hierarchical'        => false,
			'public'              => true,
			'show_ui'             => true,
			'show_in_menu'        => false,
			'show_in_admin_bar'   => true,
			'show_in_nav_menus'   => true,
			'can_export'          => true,
			'has_archive'         => false,
			'exclude_from_search' => true,
			'publicly_queryable'  => true,
			'capability_type'     => 'page',
		);
		register_post_type( 'thank_you_gift', $args );
	}

	/**
	 * Create the partner content type
	 */
	public function create_partner() {

		$labels = array(
			'name'                  => _x( 'Partners', 'Post Type General Name', 'minnpost-membership' ),
			'singular_name'         => _x( 'Partner', 'Post Type Singular Name', 'minnpost-membership' ),
			'menu_name'             => __( 'Partners', 'minnpost-membership' ),
			'name_admin_bar'        => __( 'Partner', 'minnpost-membership' ),
			'archives'              => __( 'Partner Archives', 'minnpost-membership' ),
			'attributes'            => __( 'Partner Attributes', 'minnpost-membership' ),
			'parent_item_colon'     => __( 'Parent Partner:', 'minnpost-membership' ),
			'all_items'             => __( 'All Partners', 'minnpost-membership' ),
			'add_new_item'          => __( 'Add New Partner', 'minnpost-membership' ),
			'add_new'               => __( 'Add New', 'minnpost-membership' ),
			'new_item'              => __( 'New Partner', 'minnpost-membership' ),
			'edit_item'             => __( 'Edit Partner', 'minnpost-membership' ),
			'update_item'           => __( 'Update Partner', 'minnpost-membership' ),
			'view_item'             => __( 'View Partner', 'minnpost-membership' ),
			'view_items'            => __( 'View Partners', 'minnpost-membership' ),
			'search_items'          => __( 'Search Partner', 'minnpost-membership' ),
			'not_found'             => __( 'Not found', 'minnpost-membership' ),
			'not_found_in_trash'    => __( 'Not found in Trash', 'minnpost-membership' ),
			'featured_image'        => __( 'Featured Image', 'minnpost-membership' ),
			'set_featured_image'    => __( 'Set featured image', 'minnpost-membership' ),
			'remove_featured_image' => __( 'Remove featured image', 'minnpost-membership' ),
			'use_featured_image'    => __( 'Use as featured image', 'minnpost-membership' ),
			'insert_into_item'      => __( 'Insert into partner', 'minnpost-membership' ),
			'uploaded_to_this_item' => __( 'Uploaded to this partner', 'minnpost-membership' ),
			'items_list'            => __( 'Partners list', 'minnpost-membership' ),
			'items_list_navigation' => __( 'Partners list navigation', 'minnpost-membership' ),
			'filter_items_list'     => __( 'Filter partners list', 'minnpost-membership' ),
		);
		$args   = array(
			'label'               => __( 'Partner', 'minnpost-membership' ),
			'description'         => __( 'Partner organizations that can provide offers', 'minnpost-membership' ),
			'labels'              => $labels,
			'supports'            => array( 'title', 'revisions' ),
			'hierarchical'        => false,
			'public'              => true,
			'show_ui'             => true,
			'show_in_menu'        => false,
			'show_in_admin_bar'   => true,
			'show_in_nav_menus'   => true,
			'can_export'          => true,
			'has_archive'         => false,
			'exclude_from_search' => true,
			'publicly_queryable'  => true,
			'capability_type'     => 'page',
		);
		register_post_type( 'partner', $args );
	}

	/**
	 * Set the admin sort order for custom post types created by this plugin
	 *
	 * @param object $query
	 * @return object $query
	 */
	public function membership_content_default_order( $query ) {
		if ( $query->is_admin ) {
			if ( 'partner_offer' === $query->get( 'post_type' ) || 'partner' === $query->get( 'post_type' ) ) {
				$query->set( 'orderby', 'date' );
				$query->set( 'order', 'DESC' );
			}
		}
		return $query;
	}

	public function set_parent_menu( $parent_file ) {
		global $current_screen;
		if ( in_array( $current_screen->base, array( 'post', 'edit' ), true ) && in_array( $current_screen->post_type, array( 'thank_you_gift', 'partner', 'partner_offer' ), true ) ) {
			$parent_file = $this->slug;
		}
		return $parent_file;
	}

	/**
	 * Create the partner offer content type
	 */
	public function create_partner_offer() {

		$labels = array(
			'name'                  => _x( 'Partner Offers', 'Post Type General Name', 'minnpost-membership' ),
			'singular_name'         => _x( 'Partner Offer', 'Post Type Singular Name', 'minnpost-membership' ),
			'menu_name'             => __( 'Partner Offers', 'minnpost-membership' ),
			'name_admin_bar'        => __( 'Partner Offer', 'minnpost-membership' ),
			'archives'              => __( 'Partner Offer Archives', 'minnpost-membership' ),
			'attributes'            => __( 'Partner Offer Attributes', 'minnpost-membership' ),
			'parent_item_colon'     => __( 'Parent Partner Offer:', 'minnpost-membership' ),
			'all_items'             => __( 'All Partner Offers', 'minnpost-membership' ),
			'add_new_item'          => __( 'Add New Partner Offer', 'minnpost-membership' ),
			'add_new'               => __( 'Add New', 'minnpost-membership' ),
			'new_item'              => __( 'New Partner Offer', 'minnpost-membership' ),
			'edit_item'             => __( 'Edit Partner Offer', 'minnpost-membership' ),
			'update_item'           => __( 'Update Partner Offer', 'minnpost-membership' ),
			'view_item'             => __( 'View Partner Offer', 'minnpost-membership' ),
			'view_items'            => __( 'View Partner Offers', 'minnpost-membership' ),
			'search_items'          => __( 'Search Partner Offers', 'minnpost-membership' ),
			'not_found'             => __( 'Not found', 'minnpost-membership' ),
			'not_found_in_trash'    => __( 'Not found in Trash', 'minnpost-membership' ),
			'featured_image'        => __( 'Featured Image', 'minnpost-membership' ),
			'set_featured_image'    => __( 'Set featured image', 'minnpost-membership' ),
			'remove_featured_image' => __( 'Remove featured image', 'minnpost-membership' ),
			'use_featured_image'    => __( 'Use as featured image', 'minnpost-membership' ),
			'insert_into_item'      => __( 'Insert into partner offer', 'minnpost-membership' ),
			'uploaded_to_this_item' => __( 'Uploaded to this partner offer', 'minnpost-membership' ),
			'items_list'            => __( 'Partner Offers list', 'minnpost-membership' ),
			'items_list_navigation' => __( 'Partner Offers list navigation', 'minnpost-membership' ),
			'filter_items_list'     => __( 'Filter partner offers list', 'minnpost-membership' ),
		);
		$args   = array(
			'label'               => 'Partner offer',
			'description'         => 'A partner-specific offer.',
			'labels'              => $labels,
			'supports'            => array( 'title', 'revisions' ),
			'hierarchical'        => false,
			'public'              => true,
			'show_ui'             => true,
			'show_in_menu'        => false,
			'show_in_admin_bar'   => true,
			'show_in_nav_menus'   => true,
			'can_export'          => true,
			'has_archive'         => false,
			'exclude_from_search' => true,
			'publicly_queryable'  => true,
			'capability_type'     => 'page',
		);
		register_post_type( 'partner_offer', $args );
	}

	/**
	 * Create submenus for these content items
	 */
	public function create_sub_menus() {
		$capability     = 'manage_minnpost_membership_options';
		$thank_you_gift = 'edit.php?post_type=thank_you_gift';
		add_submenu_page( $this->slug, 'Thank-you Gifts', 'Thank-you Gifts', $capability, $thank_you_gift );
		$partner        = 'edit.php?post_type=partner';
		add_submenu_page( $this->slug, 'Partners', 'Partners', $capability, $partner );
		$partner_offer  = 'edit.php?post_type=partner_offer';
		add_submenu_page( $this->slug, 'Partner Offers', 'Partner Offers', $capability, $partner_offer );
	}

	/**
	 * Create the partner offer content type
	 *
	 * @param string $title
	 * @return string $title
	 */
	public function title_placeholders( $title ) {
		$screen = get_current_screen();
		if ( 'partner' === $screen->post_type ) {
			$title = __( 'Enter partner name here', 'minnpost-membership' );
		}
		if ( 'partner_offer' === $screen->post_type ) {
			$title = __( 'Enter offer/event name here', 'minnpost-membership' );
		}
		return $title;
	}

	/**
	 * Create the thank-you gift fields with CMB2
	 */
	public function create_thank_you_gift_fields() {
		$object_type = 'thank_you_gift';
		$prefix      = '_mp_thank_you_gift_';

		$member_levels        = $this->member_levels->get_member_levels();
		$member_level_options = array();
		foreach ( $member_levels as $key => $value ) {
			$member_level_options[ $key ] = $value['name'];
		}

		$thank_you_gift_fields = new_cmb2_box(
			array(
				'id'           => $prefix . 'thank_you_gift_fields',
				'title'        => __( 'Gift Details' ),
				'object_types' => $object_type,
			)
		);
		$thank_you_gift_fields->add_field(
			array(
				'id'              => $prefix . 'description',
				'name'            => __( 'Description', 'minnpost-membership' ),
				'type'            => 'text',
				'desc'            => __( 'Enter a short description of the gift. $min_amount will show as e.g. "$15 monthly".', 'minnpost-membership' ),
				'sanitization_cb' => array( $this, 'sanitize_text_allow_html' ),
			)
		);
		$thank_you_gift_fields->add_field(
			array(
				'id'           => $prefix . 'image',
				'name'         => __( 'Image', 'minnpost-membership' ),
				'desc'         => __( 'Upload an image or enter an URL.', 'minnpost-membership' ),
				'type'         => 'file',
				'preview_size' => array( 130, 85 ),
				// query_args are passed to wp.media's library query.
				'query_args'   => array(
					'type' => 'image',
				),
			)
		);
		$thank_you_gift_fields->add_field(
			array(
				'id'   => $prefix . 'text_after_image',
				'type' => 'text',
				'name' => __( 'Text After Image', 'minnpost-membership' ),
				'desc' => __( 'If entered, text here will display after the image in a smaller size.', 'minnpost-membership' ),
			)
		);
		$thank_you_gift_fields->add_field(
			array(
				'id'      => $prefix . 'type',
				'type'    => 'radio_inline',
				'name'    => __( 'Type', 'minnpost-membership' ),
				'desc'    => __( 'Users can choose only one piece of swag; subscriptions can be multi-select.', 'minnpost-membership' ),
				'options' => array(
					'swag'                        => __( 'Swag', 'minnpost-membership' ),
					'subscription'                => __( 'Subscription', 'minnpost-membership' ),
					'swag_alongside_subscription' => __( 'Swag Alongside Subscription' ),
				),
				'default' => 'swag',
			)
		);
		$thank_you_gift_fields->add_field(
			array(
				'id'      => $prefix . 'minimum_member_level_id',
				'type'    => 'select',
				'name'    => __( 'Minimum Member Level', 'minnpost-membership' ),
				'desc'    => '',
				'options' => $member_level_options,
			)
		);
		$thank_you_gift_fields->add_field(
			array(
				'id'   => $prefix . 'fair_market_value',
				'type' => 'text',
				'name' => __( 'Fair Market Value', 'minnpost-membership' ),
				'desc' => __( 'Enter a number for the fair market value. You do not need to add the dollar sign.', 'minnpost-membership' ),
			)
		);
		$thank_you_gift_fields->add_field(
			array(
				'id'   => $prefix . 'option_name',
				'type' => 'text',
				'name' => __( 'Option Name', 'minnpost-membership' ),
				'desc' => __( 'If a donor needs to pick from a set of options, for example T-Shirt size, give it a name.', 'minnpost-membership' ),
			),
		);
		$thank_you_gift_fields->add_field(
			array(
				'id'   => $prefix . 'option_values',
				'type' => 'textarea',
				'name' => __( 'Option Value', 'minnpost-membership' ),
				'desc' => __( 'If a donor needs to pick from a set of options, for example T-Shirt size, list the values. Put each value on a line by itself, and separate the value from the label with a | character. For example, extra_small|Extra Small.', 'minnpost-membership' ),
			),
		);
		$thank_you_gift_fields->add_field(
			array(
				'id'      => $prefix . 'option_multiselect',
				'type'    => 'radio_inline',
				'name'    => __( 'Is this option multiple choice?', 'minnpost-membership' ),
				'desc'    => __( 'If a donor needs to pick from a set of options, can they pick more than one?', 'minnpost-membership' ),
				'options' => array(
					'false' => __( 'No', 'minnpost-membership' ),
					'true'  => __( 'Yes', 'minnpost-membership' ),
				),
				'default' => 'false',
			),
		);
	}

	/**
	 * Sanitize a text field while allowing html.
	 *
	 * @param mixed  $value      The unsanitized value from the form.
	 * @param array  $field_args Array of field arguments.
	 * @param object $field      The field object.
	 */
	public function sanitize_text_allow_html( $value, $field_args, $field ) {
		$value = wp_kses_post( $value );
		return $value;
	}

	/**
	 * Create the partner fields with CMB2
	 */
	public function create_partner_fields() {

		$object_type = 'partner';
		$prefix      = '_mp_partner_';

		$partner_fields = new_cmb2_box(
			array(
				'id'           => $prefix . 'partner_fields',
				'title'        => __( 'Partner Fields', 'minnpost-membership' ),
				'object_types' => $object_type,
			)
		);
		$partner_fields->add_field(
			array(
				'name' => __( 'Link URL', 'minnpost-membership' ),
				'id'   => $prefix . 'link_url',
				'type' => 'text',
				'desc' => '',
			)
		);
		$partner_fields->add_field(
			array(
				'name'         => __( 'Logo Image', 'minnpost-membership' ),
				'desc'         => __( 'Upload an image or enter an URL.', 'minnpost-membership' ),
				'id'           => $prefix . 'logo_image',
				'type'         => 'file',
				'preview_size' => array( 130, 85 ),
				'options'      => array(
					//'url' => false, // Hide the text input for the url
				),
				'text'         => array(
					//'add_upload_file_text' => 'Add Image', // Change upload button text. Default: "Add or Upload File"
				),
				// query_args are passed to wp.media's library query.
				'query_args'   => array(
					'type' => 'image',
				),
			)
		);
	}

	/**
	 * Remove unneeded default partner offer fields
	 */
	public function remove_partner_offer_fields() {
		$object_type = 'partner_offer';
		// cmb2 replaces this.
		remove_meta_box( 'pageparentdiv', $object_type, 'normal' );
	}

	/**
	 * Create the partner offer fields with CMB2
	 */
	public function create_partner_offer_fields() {
		$object_type = 'partner_offer';
		$prefix      = '_mp_partner_offer_';

		// set partner for the partner offer.
		$partner_box = new_cmb2_box(
			array(
				'id'           => $prefix . 'parent',
				'title'        => 'Partner',
				'object_types' => $object_type,
				'context'      => 'side',
				'priority'     => 'high',
			)
		);
		// get all partner posts.
		$posts = get_posts(
			array(
				'post_type'      => 'partner',
				'posts_per_page' => -1,
				'orderby'        => 'title',
				'order'          => 'ASC',
			)
		);
		$items = array();
		foreach ( $posts as $post ) {
			$items[ $post->ID ] = $post->post_title;
		}
		$partner_box->add_field(
			array(
				'name'             => '',
				'desc'             => '',
				'id'               => 'partner_id',
				'type'             => 'select',
				'show_option_none' => __( 'Choose Partner', 'minnpost-membership' ),
				'default'          => '',
				'options'          => $items,
				'attributes'       => array(
					'required' => 'required',
				),
			)
		);

		// set other partner offer fields.
		$offer_fields = new_cmb2_box(
			array(
				'id'           => $prefix . 'offer_fields',
				'title'        => __( 'Offer fields', 'minnpost-membership' ),
				'object_types' => $object_type,
				'context'      => 'normal',
				//'priority'     => 'high',
			)
		);
		$offer_fields->add_field(
			array(
				'name'       => __( 'Quantity', 'minnpost-membership' ),
				'desc'       => '',
				'default'    => '',
				'id'         => $prefix . 'quantity',
				'type'       => 'text_small',
				'attributes' => array(),
			)
		);
		$offer_fields->add_field(
			array(
				'name'       => __( 'Type', 'minnpost-membership' ),
				'desc'       => '',
				'default'    => '',
				'id'         => $prefix . 'type',
				'type'       => 'text',
				'attributes' => array(),
			)
		);
		$offer_fields->add_field(
			array(
				'name'       => __( 'Restriction', 'minnpost-membership' ),
				'desc'       => '',
				'default'    => '',
				'id'         => $prefix . 'restriction',
				'type'       => 'text',
				'attributes' => array(),
			)
		);
		/*$offer_fields->add_field( array(
			'name'       => __( 'Offer Image', 'minnpost-membership' ),
			'desc'       => __( 'Upload an image or enter an URL.', 'minnpost-membership' ),
			'id'         => $prefix . 'offer_image',
			'type'       => 'file',
			//'preview_size' => array( 130, 85 ),
			'options'    => array(
				//'url' => false, // Hide the text input for the url
			),
			'text'       => array(
				//'add_upload_file_text' => 'Add Image', // Change upload button text. Default: "Add or Upload File"
			),
			// query_args are passed to wp.media's library query.
			'query_args' => array(
				'type' => 'image',
			),
		) );*/

		// set more info partner offer fields.
		$more_info_fields = new_cmb2_box(
			array(
				'id'           => $prefix . 'more_info_fields',
				'title'        => __( 'More info fields', 'minnpost-membership' ),
				'object_types' => $object_type,
				'context'      => 'normal',
				//'priority'     => 'high',
			)
		);
		$more_info_fields->add_field(
			array(
				'name'       => __( 'Text', 'minnpost-membership' ),
				'desc'       => '',
				'default'    => '',
				'id'         => $prefix . 'more_info_text',
				'type'       => 'text',
				'attributes' => array(),
			)
		);
		$more_info_fields->add_field(
			array(
				'name'       => __( 'URL', 'minnpost-membership' ),
				'desc'       => '',
				'default'    => '',
				'id'         => $prefix . 'more_info_url',
				'type'       => 'text',
				'attributes' => array(),
			)
		);

		$claimable_dates = new_cmb2_box(
			array(
				'id'           => $prefix . 'claimable_dates',
				'title'        => __( 'Claimable dates', 'minnpost-membership' ),
				'object_types' => $object_type,
				'context'      => 'normal',
				//'priority'     => 'high',
			)
		);
		$claimable_dates->add_field(
			array(
				'name'       => 'Start',
				'desc'       => '',
				'id'         => $prefix . 'claimable_start_date',
				'type'       => 'text_datetime_timestamp',
				'attributes' => array(
					'required' => 'required',
				),
			)
		);
		$claimable_dates->add_field(
			array(
				'name' => 'End',
				'desc' => '',
				'id'   => $prefix . 'claimable_end_date',
				'type' => 'text_datetime_timestamp',
			)
		);

		$instance_box = new_cmb2_box(
			array(
				'id'           => $prefix . 'instances',
				'title'        => 'Offer instance(s)',
				'object_types' => $object_type,
				'context'      => 'normal',
				//'priority'     => 'high',
			)
		);

		$instance_box->add_field(
			array(
				'id'          => $prefix . 'instance',
				'type'        => 'group',
				'description' => '',
				'options'     => array(
					'group_title'   => esc_html__( 'Instance {#}', 'minnpost-membership' ), // {#} gets replaced by row number
					'add_button'    => esc_html__( 'Add Another Instance', 'minnpost-membership' ),
					'remove_button' => esc_html__( 'Remove Instance', 'minnpost-membership' ),
					'sortable'      => true,
					// 'closed'     => true, // true to have the groups closed by default
				),
			)
		);

		$instance_box->add_group_field(
			$prefix . 'instance',
			array(
				'name' => 'Enabled',
				'id'   => $prefix . 'instance_enabled',
				'type' => 'checkbox',
				'desc' => '',
			)
		);

		$instance_box->add_group_field(
			$prefix . 'instance',
			array(
				'name' => esc_html__( 'Instance date', 'minnpost-membership' ),
				'id'   => $prefix . 'instance_date',
				'type' => 'text_datetime_timestamp',
				// 'repeatable' => true, // Repeatable fields are supported w/in repeatable groups (for most types)
			)
		);

		$instance_box->add_group_field(
			$prefix . 'instance',
			array(
				'name' => esc_html__( 'Claimed date', 'minnpost-membership' ),
				'id'   => $prefix . 'claimed_date',
				'type' => 'text_datetime_timestamp',
				// 'repeatable' => true, // Repeatable fields are supported w/in repeatable groups (for most types)
			)
		);

		$member_levels = $this->member_levels->get_member_levels( '', false );
		if ( is_array( $member_levels ) && ! empty( $member_levels ) ) {
			foreach ( $member_levels as $member_level ) {
				$roles[] = $member_level['slug'];
			}
		}
		$roles[] = 'administrator';
		$roles[] = 'business';

		$instance_box->add_group_field(
			$prefix . 'instance',
			array(
				'name'    => 'Claim user',
				'id'      => $prefix . 'claim_user',
				'desc'    => 'Type the name of the user to set them as the claiming user',
				'type'    => 'user_select_text',
				'options' => array(
					'user_roles' => $roles, // Specify which roles to query for.
				),
			)
		);

	}

	/**
	 * Get all partners
	 * @param int $partner_id
	 * @return object $partners
	 */
	public function get_partners( $partner_id = '' ) {
		$args = array(
			'posts_per_page' => -1,
			'post_type'      => 'partner',
			'orderby'        => 'title',
			'order'          => 'ASC',
		);
		if ( '' !== $partner_id ) {
			$partner       = get_post( $partner_id );
			$partner->meta = get_post_meta( $partner_id );
			return $partner;
		} else {
			$partners = new WP_Query( $args );
			return $partners;
		}
	}

	/**
	 * Display the partner <figure>
	 * @param int $partner_id
	 * @param string $size
	 * @param bool $include_link
	 * @param bool $include_name
	 * @param bool $lazy_load
	 */
	public function partner_figure( $partner_id = '', $size = 'partner-logo', $include_link = true, $include_name = false, $lazy_load = false ) {
		$output = $this->get_partner_figure( $partner_id, $size, $include_link, $include_name, $lazy_load );
		echo $output;
	}

	/**
	 * Get the partner <figure> html
	 * @param int $partner_id
	 * @param string $size
	 * @param bool $include_link
	 * @param bool $include_name
	 * @param bool $lazy_load
	 */
	public function get_partner_figure( $partner_id = '', $size = 'partner-logo', $include_link = true, $include_name = false, $lazy_load = false ) {

		if ( '' === $partner_id ) {
			$partner_id = get_the_ID();
		}

		$image_data = $this->get_partner_image( $partner_id, $size, $lazy_load );
		if ( '' !== $image_data ) {
			$image_id  = $image_data['image_id'];
			$image_url = $image_data['image_url'];
			$image     = $image_data['markup'];
		}

		$link = get_post_meta( $partner_id, '_mp_partner_link_url', true );

		if ( post_password_required() || is_attachment() || ( ! isset( $image_id ) && ! isset( $image_url ) ) ) {
			return;
		}

		$name = '';
		$name = get_the_title( $partner_id );

		$output  = '';
		$output .= '<figure class="a-partner-figure a-partner-figure-' . $size . '">';
		if ( true === $include_link && '' !== $link ) {
			$output .= '<a href="' . $link . '">';
		}
		$output .= $image;
		if ( true === $include_link && '' !== $link ) {
			$output .= '</a>';
		}
		if ( true === $include_name && '' !== $name ) {
			$output .= '<figcaption>';
			if ( true === $include_name && '' !== $name ) {
				$output .= '<h3 class="a-author-title"><a href="' . get_author_posts_url( $author_id, sanitize_title( $name ) ) . '">' . $name . '</a></h3>';
			}
			$output .= $text;
			$output .= '</figcaption>';
		}
		$output .= '</figure><!-- .author-figure -->';
		return $output;
	}

	/**
	 * Get the image for the partner
	 * @param int $partner_id
	 * @param string $size
	 * @param bool $lazy_load
	 */
	public function get_partner_image( $partner_id, $size = 'partner-logo', $lazy_load = false ) {
		$image_url = get_post_meta( $partner_id, '_mp_partner_logo_image', true );
		if ( 'partner-logo' !== $size ) {
			$image_url = get_post_meta( $partner_id, '_mp_partner_logo_image' . $size, true );
		}
		$image_id = get_post_meta( $partner_id, '_mp_partner_logo_image_id', true );

		if ( post_password_required() || is_attachment() || ( ! $image_id && ! $image_url ) ) {
			return '';
		}

		if ( '' !== wp_get_attachment_image( $image_id, $size ) ) {
			$image = wp_get_attachment_image( $image_id, $size );
		} else {
			$alt   = get_post_meta( $image_id, '_wp_attachment_image_alt', true );
			$image = '<img src="' . $image_url . '" alt="' . $alt . '">';
		}

		if ( true === $lazy_load ) {
			$params = array( 'html_tag' => 'img' );
			$image  = apply_filters( 'wp_lozad_lazyload_convert_html', $image, $params );
		}

		$image_data = array(
			'image_id'  => $image_id,
			'image_url' => $image_url,
			'markup'    => $image,
		);
		return $image_data;
	}

	/**
	 * Get all partner offers
	 * @param int $partner_offer_id
	 * @return object $partner_offers
	 */
	public function get_partner_offers( $partner_offer_id = '' ) {

		global $wpdb;

		$now = time();
		//$now = date( 'Y-m-d', strtotime( '-1 month' ) );
		//$now = date( 'Y-m-d', strtotime( '+1 month' ) );

		$query = $wpdb->prepare(
			"SELECT
			offer.ID, offer.post_author, offer.post_content, offer.post_title,
			partner.meta_value as post_parent,
			offer.post_type as post_type,
			partner_image_id.meta_value as partner_logo_image_id, partner_image.meta_value as partner_logo_image,
			partner_link.meta_value as partner_link_url,
			quantity.meta_value as quantity,
			offer_type.meta_value as offer_type,
			restriction.meta_value as restriction,
			more_info_text.meta_value as more_info_text,
			more_info_url.meta_value as more_info_url,
			claimable_start_date.meta_value as claimable_start_date, claimable_end_date.meta_value as claimable_end_date,

			instance.meta_value as instances,

			IF(%s BETWEEN claimable_start_date.meta_value AND claimable_end_date.meta_value, true, false) as claimable

			FROM {$wpdb->prefix}posts offer

			LEFT JOIN {$wpdb->prefix}postmeta AS partner ON offer.ID = partner.post_id AND 'partner_id' = partner.meta_key
			LEFT JOIN {$wpdb->prefix}postmeta AS partner_image_id ON partner.meta_value = partner_image_id.post_id AND '_mp_partner_logo_image_id' = partner_image_id.meta_key
			LEFT JOIN {$wpdb->prefix}postmeta AS partner_image ON partner.meta_value = partner_image.post_id AND '_mp_partner_logo_image' = partner_image.meta_key
			LEFT JOIN {$wpdb->prefix}postmeta AS partner_link ON partner.meta_value = partner_link.post_id AND '_mp_partner_link_url' = partner_link.meta_key

			LEFT JOIN {$wpdb->prefix}postmeta AS quantity ON offer.ID = quantity.post_id AND '_mp_partner_offer_quantity' = quantity.meta_key
			LEFT JOIN {$wpdb->prefix}postmeta AS offer_type ON offer.ID = offer_type.post_id AND '_mp_partner_offer_type' = offer_type.meta_key
			LEFT JOIN {$wpdb->prefix}postmeta AS restriction ON offer.ID = restriction.post_id AND '_mp_partner_offer_restriction' = restriction.meta_key
			LEFT JOIN {$wpdb->prefix}postmeta AS more_info_text ON offer.ID = more_info_text.post_id AND '_mp_partner_offer_more_info_text' = more_info_text.meta_key
			LEFT JOIN {$wpdb->prefix}postmeta AS more_info_url ON offer.ID = more_info_url.post_id AND '_mp_partner_offer_more_info_url' = more_info_url.meta_key
			LEFT JOIN {$wpdb->prefix}postmeta AS claimable_start_date ON offer.ID = claimable_start_date.post_id AND '_mp_partner_offer_claimable_start_date' = claimable_start_date.meta_key
			LEFT JOIN {$wpdb->prefix}postmeta AS claimable_end_date ON offer.ID = claimable_end_date.post_id AND '_mp_partner_offer_claimable_end_date' = claimable_end_date.meta_key

			LEFT JOIN {$wpdb->prefix}postmeta AS instance ON offer.ID = instance.post_id AND '_mp_partner_offer_instance' = instance.meta_key

			WHERE offer.post_status = 'publish' AND offer.post_type = 'partner_offer'

		",
			$now
		);

		if ( '' !== $partner_offer_id ) {
			$cond   = $wpdb->prepare( ' AND offer.ID = %s', $partner_offer_id );
			$query .= $cond;
		}

		//$query .= 'ORDER BY available_instance_count DESC, claimable_start_date DESC, claimable_end_date DESC';
		$query .= ' ORDER BY claimable_start_date DESC, claimable_end_date DESC';

		$partner_offers = $wpdb->get_results( $query, OBJECT ); // WPCS: unprepared SQL ok.
		foreach ( $partner_offers as $partner_offer ) {
			$partner_offer = $this->store_partner_offer_instances( $partner_offer );
		}

		usort( $partner_offers, array( $this, 'sort_partner_offer_instances' ) );

		if ( '' !== $partner_offer_id ) {
			return $partner_offers[0];
		} else {
			return $partner_offers;
		}

	}

	/**
	 * Save partner offer instances to the partner offer object
	 *
	 * @param object $partner_offer
	 * @return object $partner_offer
	 */
	private function store_partner_offer_instances( $partner_offer ) {
		$unclaimed_instance_count = 0;
		$dated_instance_count     = 0;

		if ( null !== $partner_offer->instances ) {
			$instances = maybe_unserialize( $partner_offer->instances );
			if ( is_array( $instances ) ) {
				foreach ( $instances as $key => $instance ) {
					if ( ! isset( $instance['_mp_partner_offer_instance_enabled'] ) || 'on' !== $instance['_mp_partner_offer_instance_enabled'] ) {
						continue;
					}
					if ( isset( $instance['_mp_partner_offer_claimed_date'] ) && '' !== $instance['_mp_partner_offer_claimed_date'] ) {
						continue;
					}
					$unclaimed_instance_count++;
				}
				foreach ( $instances as $key => $instance ) {
					if ( ! isset( $instance['_mp_partner_offer_instance_date'] ) || '' === $instance['_mp_partner_offer_instance_date'] ) {
						continue;
					}
					$dated_instance_count++;
				}
			}
		}
		$partner_offer->unclaimed_instance_count = $unclaimed_instance_count;
		$partner_offer->dated_instance_count     = $dated_instance_count;
		$partner_offer->instances                = $instances;
		return $partner_offer;
	}

	/**
	 * Sort partner offer instances by instance count
	 *
	 * @param object $a
	 * @param object $b
	 * @param array
	 */
	private function sort_partner_offer_instances( $a, $b ) {
		return strcmp( $b->unclaimed_instance_count, $a->unclaimed_instance_count );
	}

	/**
	 * Get user's claims in descending order. Returns timestamp as key, partner offer post object as value
	 * @return array $user_claims
	 */
	public function get_user_offer_claims() {
		$user_claims    = array();
		$partner_offers = $this->get_partner_offers();
		foreach ( $partner_offers as $partner_offer ) {
			foreach ( $partner_offer->instances as $instance ) {
				$how_often            = get_option( $this->option_prefix . 'account-benefits-partner-offers_claim_frequency', '' );
				$oldest_eligible_date = strtotime( '-' . $how_often, time() );
				if ( isset( $instance['_mp_partner_offer_claimed_date'] ) && $instance['_mp_partner_offer_claimed_date'] < $oldest_eligible_date ) {
					continue;
				} elseif ( ! isset( $instance['_mp_partner_offer_claim_user'] ) ) {
					continue;
				} elseif ( ! isset( $instance['_mp_partner_offer_claimed_date'] ) || '' === $instance['_mp_partner_offer_claimed_date'] || ( get_current_user_id() !== (int) $instance['_mp_partner_offer_claim_user']['id'] ) ) {
					continue;
				} else {
					$partner_offer->user_claimed = $instance['_mp_partner_offer_claimed_date'];

					$user_claims[ $instance['_mp_partner_offer_claimed_date'] ] = $partner_offer;
				}
			}
		}
		rsort( $user_claims );
		return $user_claims;
	}

	/**
	 * Output partner offer image
	 *
	 * @param int $id
	 * @param array $attributes
	 * @param bool $lazy_load
	 */
	public function partner_offer_image( $id, $attributes = array(), $lazy_load = true ) {
		$image_data = $this->get_partner_offer_image( $id, $attributes, $lazy_load );
		if ( '' !== $image_data ) {
			$image_id  = $image_data['image_id'];
			$image_url = $image_data['image_url'];
			$image     = $image_data['markup'];
		}

		if ( post_password_required() || is_attachment() || ( ! isset( $image_id ) && ! isset( $image_url ) ) ) {
			return;
		}

		if ( true === $lazy_load ) {
			$params = array( 'html_tag' => 'img' );
			$image  = apply_filters( 'wp_lozad_lazyload_convert_html', $image, $params );
		}

		$caption = wp_get_attachment_caption( $image_id );
		$credit  = get_media_credit_html( $image_id, false ); // don't show the uploader by default
		?>
		<figure class="m-partner-offer-image">
			<?php echo $image; ?>
			<?php if ( '' !== $caption || '' !== $credit ) { ?>
			<figcaption>
				<?php if ( '' !== $credit ) { ?>
					<div class="a-media-meta a-media-credit"><?php echo $credit; ?></div>
				<?php } ?>
				<?php if ( '' !== $caption ) { ?>
					<div class="a-media-meta a-media-caption"><?php echo $caption; ?></div>
				<?php } ?>
			</figcaption>
			<?php } ?>
		</figure><!-- .post-image -->
		<?php
	}


	/**
	 * Get the partner offer image based on where it should go
	 *
	 * @param int $id
	 * @param array $attributes
	 * @param bool $lazy_load
	 *
	 * @return array $image_data
	 */
	public function get_partner_offer_image( $id, $attributes = array(), $lazy_load = true ) {

		$image_url = get_post_meta( $id, '_mp_partner_logo_image', true );
		$image_id  = get_post_meta( $id, '_mp_partner_logo_image_id', true );

		if ( '' !== wp_get_attachment_image( $image_id, 'full' ) ) {
			// this requires that the custom image sizes in custom-fields.php work correctly.
			$image = wp_get_attachment_image( $image_id, 'full' );
		} else {
			if ( '' !== $image_id ) {
				$alt = get_post_meta( $image_id, '_wp_attachment_image_alt', true );
			} else {
				$alt = '';
			}
			$image = '<img src="' . $image_url . '" alt="' . $alt . '">';
		}

		if ( post_password_required() || is_attachment() || ( '' === $image_id && '' === $image_url ) ) {
			return;
		}

		if ( true === $lazy_load ) {
			$params = array( 'html_tag' => 'img' );
			$image  = apply_filters( 'wp_lozad_lazyload_convert_html', $image, $params );
		}

		$image_data = array(
			'image_id'  => $image_id,
			'image_url' => $image_url,
			'markup'    => $image,
		);
		return $image_data;
	}

}
