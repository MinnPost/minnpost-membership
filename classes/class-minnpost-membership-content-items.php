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
 * Create default WordPress front end functionality
 */
class MinnPost_Membership_Content_Items {

	protected $option_prefix;
	protected $version;
	protected $slug;
	protected $member_levels;
	protected $user_info;
	protected $cache;

	/**
	* Constructor which sets up content items
	*
	* @param string $option_prefix
	* @param string $version
	* @param string $slug
	* @param object $member_levels
	* @param object $user_info
	* @param object $cache
	* @throws \Exception
	*/
	public function __construct( $option_prefix, $version, $slug, $member_levels, $user_info, $cache ) {

		$this->option_prefix = $option_prefix;
		$this->version       = $version;
		$this->slug          = $slug;
		$this->member_levels = $member_levels;
		$this->user_info     = $user_info;
		$this->cache         = $cache;

		$this->mp_mem_transients = $this->cache->mp_mem_transients;

		$this->add_actions();

	}

	/**
	* Create the action hooks to create content items
	*
	*/
	public function add_actions() {
		add_action( 'init', array( $this, 'create_partner' ), 0 );
		add_action( 'cmb2_init', array( $this, 'create_partner_fields' ) );
	}

	/**
	* Create the partner content type
	*
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
			'description'         => __( 'Post Type Description', 'minnpost-membership' ),
			'labels'              => $labels,
			'supports'            => array( 'title', 'revisions' ),
			'hierarchical'        => true,
			'public'              => false,
			'show_ui'             => true,
			'show_in_menu'        => 'admin.php?page=minnpost-membership',
			'menu_position'       => 5,
			'show_in_admin_bar'   => true,
			'show_in_nav_menus'   => false,
			'can_export'          => true,
			'has_archive'         => false,
			'exclude_from_search' => true,
			'publicly_queryable'  => true,
			'capability_type'     => 'page',
		);
		register_post_type( 'partner', $args );

	}

	/**
	* Create the partner fields with CMB2
	*
	*/
	public function create_partner_fields() {

		$object_type = 'partner';
		$prefix      = '_mp_partner_';

		$partner_fields = new_cmb2_box( array(
			'id'           => $prefix . 'partner_fields',
			'title'        => 'Partner Fields',
			'object_types' => $object_type,
			//'context'    => 'after_title',
			//'priority'   => 'high',
		) );
		$partner_fields->add_field( array(
			'name' => 'Link URL',
			'id'   => $prefix . 'link_url',
			'type' => 'text',
			'desc' => '',
		) );
		$partner_fields->add_field( array(
			'name'         => 'Logo Image',
			'desc'         => 'Upload an image or enter an URL.',
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
		) );
	}

	/**
	* Get all partners
	* @param int $partner_id
	* @return object $partners
	*
	*/
	public function get_partners( $partner_id = '' ) {
		$args = array(
			'posts_per_page' => -1,
			'post_type'      => 'partner',
			'orderby'        => 'title',
			'order'          => 'ASC',
		);
		if ( '' !== $partner_id ) {
			$args['p'] = $partner_id;
		}
		$partners = new WP_Query( $args );
		return $partners;
	}

	/**
	* Display the partner <figure>
	* @param int $partner_id
	* @param string $size
	* @param bool $include_link
	* @param bool $include_name
	*
	*/
	public function partner_figure( $partner_id = '', $size = 'partner-logo', $include_link = true, $include_name = false ) {
		$output = $this->get_partner_figure( $partner_id, $size, $include_link, $include_name );
		echo $output;
	}

	/**
	* Get the partner <figure> html
	* @param int $partner_id
	* @param string $size
	* @param bool $include_link
	* @param bool $include_name
	*
	*/
	public function get_partner_figure( $partner_id = '', $size = 'partner-logo', $include_link = true, $include_name = false ) {

		if ( '' === $partner_id ) {
			$partner_id = get_the_ID();
		}

		$image_data = $this->get_partner_image( $partner_id, $size );
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
	*
	*/
	public function get_partner_image( $partner_id, $size = 'partner-logo' ) {
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

		$image = apply_filters( 'easy_lazy_loader_html', $image );

		$image_data = array(
			'image_id'  => $image_id,
			'image_url' => $image_url,
			'markup'    => $image,
		);
		return $image_data;
	}
}