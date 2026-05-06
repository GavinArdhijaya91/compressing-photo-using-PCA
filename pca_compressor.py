import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.decomposition import PCA
from skimage import io
import os


def compress_image(image_path, num_components=50, output_path='output/compressed_img.png'):
    try:
        image = io.imread(image_path)

        if len(image.shape) == 3 and image.shape[2] == 4:
            image = image[:, :, :3]

        image_f = image.astype(np.float64) / 255.0 if image.dtype == np.uint8 else image.astype(np.float64)
        original_h, original_w = image_f.shape[:2]
        is_color = len(image_f.shape) == 3

        explained_var_ratios = []

        if is_color:
            reconstructed_channels = []
            for c in range(image_f.shape[2]):
                channel = image_f[:, :, c]
                k = max(1, min(num_components, channel.shape[0], channel.shape[1]))
                pca = PCA(n_components=k)
                reconstructed = pca.inverse_transform(pca.fit_transform(channel))
                reconstructed_channels.append(np.clip(reconstructed, 0.0, 1.0))
                explained_var_ratios.append(np.sum(pca.explained_variance_ratio_))
            reconstructed_image = np.stack(reconstructed_channels, axis=2)
        else:
            k = max(1, min(num_components, image_f.shape[0], image_f.shape[1]))
            pca = PCA(n_components=k)
            reconstructed_image = np.clip(pca.inverse_transform(pca.fit_transform(image_f)), 0.0, 1.0)
            explained_var_ratios.append(np.sum(pca.explained_variance_ratio_))

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        io.imsave(output_path, (reconstructed_image * 255).astype(np.uint8))

        original_size   = os.path.getsize(image_path)
        compressed_size = os.path.getsize(output_path)

        return {
            'output_path':         output_path,
            'original_size':       original_size,
            'compressed_size':     compressed_size,
            'compression_ratio':   round((1.0 - compressed_size / original_size) * 100.0, 2),
            'explained_variance':  round(float(np.mean(explained_var_ratios)) * 100.0, 2),
            'num_components_used': k,
            'original_dimensions': (original_h, original_w),
        }

    except Exception as e:
        print(f"compress_image error: {e}")
        return None


def generate_comparison_plot(original_path, compressed_path, output_plot_path='output/plot.png', stats=None):
    try:
        original   = io.imread(original_path)
        compressed = io.imread(compressed_path)

        fig, axes = plt.subplots(1, 2, figsize=(14, 6), facecolor='#111111')
        fig.patch.set_facecolor('#111111')

        k = stats['num_components_used'] if stats else '?'
        titles = ['Original', f'Compressed (k={k})']

        for ax, img, title in zip(axes, [original, compressed], titles):
            ax.imshow(img)
            ax.set_title(title, color='#ffffff', fontsize=13, fontweight='600', pad=10)
            ax.axis('off')
            for spine in ax.spines.values():
                spine.set_edgecolor('#222222')

            if stats:
                label = (f"{stats['original_size'] / 1024:.1f} KB" if title == 'Original'
                         else f"{stats['compressed_size'] / 1024:.1f} KB  "
                              f"({stats['compression_ratio']:+.1f}%)  "
                              f"Var: {stats['explained_variance']:.1f}%")
                ax.set_xlabel(label, color='#666666', fontsize=10)

        plt.tight_layout(pad=2.0)
        os.makedirs(os.path.dirname(output_plot_path), exist_ok=True)
        plt.savefig(output_plot_path, dpi=100, bbox_inches='tight', facecolor='#111111', edgecolor='none')
        plt.close()
        return output_plot_path

    except Exception as e:
        print(f"generate_comparison_plot error: {e}")
        return None
