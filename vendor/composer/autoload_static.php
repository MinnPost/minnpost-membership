<?php

// autoload_static.php @generated by Composer

namespace Composer\Autoload;

class ComposerStaticInit4ee2407d53579e536b7758d8769b4394
{
    public static $files = array (
        '253c157292f75eb38082b5acb06f3f01' => __DIR__ . '/..' . '/nikic/fast-route/src/functions.php',
        '12c34a21bf6f2ea3ecc88d700c669771' => __DIR__ . '/..' . '/cmb2/cmb2/init.php',
    );

    public static $prefixLengthsPsr4 = array (
        'P' => 
        array (
            'Psr\\Http\\Message\\' => 17,
        ),
        'F' => 
        array (
            'FastRoute\\' => 10,
        ),
        'B' => 
        array (
            'Brain\\' => 6,
        ),
    );

    public static $prefixDirsPsr4 = array (
        'Psr\\Http\\Message\\' => 
        array (
            0 => __DIR__ . '/..' . '/psr/http-message/src',
        ),
        'FastRoute\\' => 
        array (
            0 => __DIR__ . '/..' . '/nikic/fast-route/src',
        ),
        'Brain\\' => 
        array (
            0 => __DIR__ . '/..' . '/brain/cortex/src',
        ),
    );

    public static $classMap = array (
        'Composer\\InstalledVersions' => __DIR__ . '/..' . '/composer/InstalledVersions.php',
    );

    public static function getInitializer(ClassLoader $loader)
    {
        return \Closure::bind(function () use ($loader) {
            $loader->prefixLengthsPsr4 = ComposerStaticInit4ee2407d53579e536b7758d8769b4394::$prefixLengthsPsr4;
            $loader->prefixDirsPsr4 = ComposerStaticInit4ee2407d53579e536b7758d8769b4394::$prefixDirsPsr4;
            $loader->classMap = ComposerStaticInit4ee2407d53579e536b7758d8769b4394::$classMap;

        }, null, ClassLoader::class);
    }
}
