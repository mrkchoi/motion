import {
  getDataTexture,
  getSphereTexture,
  getVelocityTexture,
} from "./util/getDataTexture";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MeshPhysicalMaterial, MeshMatcapMaterial } from "three";
import { useThree, useLoader } from "@react-three/fiber";
import simFragmentPosition from "./shaders/simulation/simFragmentPosition";
import simFragmentVelocity from "./shaders/simulation/simFragmentVelocity";

import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";

import CustomShaderMaterial from "three-custom-shader-material";
import { patchShaders } from "gl-noise/build/glNoise.m";

import matcap from "./assets/matcap/matcap4.png";

const shader = {
  vertex: /* glsl */ `
    uniform float uTime;
    uniform sampler2D uPosition;
    uniform sampler2D uVelocity;
    attribute vec2 ref;

    vec3 rotate3D(vec3 v, vec3 vel) {
      vec3 newpos = v;
      vec3 up = vec3(0, 1, 0);
      vec3 axis = normalize(cross(up, vel));
      float angle = acos(dot(up, normalize(vel)));
      newpos = newpos * cos(angle) + cross(axis, newpos) * sin(angle) + axis * dot(axis, newpos) * (1. - cos(angle));
      return newpos;
}

    vec3 displace(vec3 point, vec3 vel) {
      vec3 pos = texture2D(uPosition,ref).rgb;
      vec3 copypoint = rotate3D(point, vel);
      vec3 instancePosition = (instanceMatrix * vec4(copypoint, 1.)).xyz;
      return instancePosition + pos;
    }  

    void main() {
      vec3 vel = texture2D(uVelocity,ref).rgb;
      vec3 p = displace(position, vel);
      csm_PositionRaw = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.);
      csm_Normal = rotate3D(normal, vel);
    }
    `,
  fragment: /* glsl */ `
    void main() {
      csm_DiffuseColor = vec4(1.);
    }
    `,
};

function Particles() {
  const SIZE = 256;
  const texture = new THREE.TextureLoader().load(matcap);
  const iref = useRef();
  const followMouse = useRef();
  const { gl, viewport } = useThree();
  const gpuCompute = new GPUComputationRenderer(SIZE, SIZE, gl);

  const pointsOnASphere = getSphereTexture(SIZE);

  const positionVariable = gpuCompute.addVariable(
    "uCurrentPosition",
    simFragmentPosition,
    pointsOnASphere,
  );
  const velocityVariable = gpuCompute.addVariable(
    "uCurrentVelocity",
    simFragmentVelocity,
    getVelocityTexture(SIZE),
  );

  gpuCompute.setVariableDependencies(positionVariable, [
    positionVariable,
    velocityVariable,
  ]);

  gpuCompute.setVariableDependencies(velocityVariable, [
    positionVariable,
    velocityVariable,
  ]);

  const positionUniforms = positionVariable.material.uniforms;
  const velocityUniforms = velocityVariable.material.uniforms;

  velocityUniforms.uMouse = { value: new THREE.Vector3(0, 0, 0) };
  positionUniforms.uOriginalPosition = { value: pointsOnASphere };
  velocityUniforms.uOriginalPosition = { value: pointsOnASphere };

  gpuCompute.init();

  const uniforms = useMemo(
    () => ({
      uPosition: {
        value: null,
      },
      uVelocity: {
        value: null,
      },
    }),
    [],
  );

  useEffect(() => {
    const ref = new Float32Array(SIZE * SIZE * 2);
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        const k = i * SIZE + j;
        ref[k * 2 + 0] = i / (SIZE - 1);
        ref[k * 2 + 1] = j / (SIZE - 1);
      }
    }
    iref.current.geometry.setAttribute(
      "ref",
      new THREE.InstancedBufferAttribute(ref, 2),
    );
  }, []);

  useFrame(({ mouse }) => {
    followMouse.current.position.x = (mouse.x * viewport.width) / 2;
    followMouse.current.position.y = (mouse.y * viewport.height) / 2;

    velocityUniforms.uMouse.value.x = (mouse.x * viewport.width) / 2;
    velocityUniforms.uMouse.value.y = (mouse.y * viewport.height) / 2;
  });

  useFrame(({ gl }) => {
    gpuCompute.compute();
    iref.current.material.uniforms.uPosition.value =
      gpuCompute.getCurrentRenderTarget(positionVariable).texture;
    iref.current.material.uniforms.uVelocity.value =
      gpuCompute.getCurrentRenderTarget(velocityVariable).texture;
  });

  return (
    <>
      <mesh ref={followMouse}>
        <sphereGeometry args={[0.1, 32, 32]} />
        <meshBasicMaterial color="red" />
      </mesh>

      <instancedMesh ref={iref} args={[null, null, SIZE * SIZE]}>
        <boxGeometry args={[0.01, 0.03, 0.01]} />
        {/* <meshNormalMaterial /> */}
        <CustomShaderMaterial
          baseMaterial={MeshMatcapMaterial}
          // size={0.01}
          matcap={texture}
          vertexShader={patchShaders(shader.vertex)}
          fragmentShader={patchShaders(shader.fragment)}
          uniforms={uniforms}
          transparent
        />
      </instancedMesh>
    </>
  );
}

export default Particles;
